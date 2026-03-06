"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { CallState } from "./types"

export interface AudioDevice {
  deviceId: string
  label: string
}

interface NoiseGateState {
  ctx: AudioContext
  source: MediaStreamAudioSourceNode
  analyser: AnalyserNode
  gainNode: GainNode
  destination: MediaStreamAudioDestinationNode
  interval: ReturnType<typeof setInterval>
  holdTimer: ReturnType<typeof setTimeout> | null
  micStream: MediaStream // the fresh mic stream we acquired
  originalSenderTrack: MediaStreamTrack // so we can restore on removal
}

/**
 * Create a noise gate that silences the mic when you're not speaking.
 * Acquires a FRESH mic stream (separate from Telnyx's) and processes it
 * through: source → analyser → gainNode → destination.
 * When RMS volume is below the threshold, gain = 0 (dead silent).
 * When above, gain = 1 (open). Hold time prevents cutting between words.
 *
 * Returns the gated output stream ready to be swapped onto the RTC sender.
 */
async function createNoiseGate(
  audioConstraints: MediaTrackConstraints,
  thresholdDb: number = -35,
  holdMs: number = 300,
): Promise<NoiseGateState & { gatedStream: MediaStream }> {
  // Acquire a FRESH mic stream — this is key. We can't reuse Telnyx's
  // track because it's already consumed by the RTC pipeline.
  const micStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })

  const ctx = new AudioContext()
  // Resume in case browser suspended it
  if (ctx.state === "suspended") await ctx.resume()

  const source = ctx.createMediaStreamSource(micStream)
  const analyser = ctx.createAnalyser()
  const gainNode = ctx.createGain()
  const destination = ctx.createMediaStreamDestination()

  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.2

  source.connect(analyser)
  analyser.connect(gainNode)
  gainNode.connect(destination)

  // Start closed (silent)
  gainNode.gain.value = 0

  const dataArray = new Float32Array(analyser.fftSize)
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let logCounter = 0

  const interval = setInterval(() => {
    if (ctx.state === "closed") return
    analyser.getFloatTimeDomainData(dataArray)

    // Calculate RMS volume
    let sum = 0
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i]
    }
    const rms = Math.sqrt(sum / dataArray.length)
    const db = 20 * Math.log10(rms + 1e-10)

    // Debug: log dB level every ~1s so we can see actual levels
    logCounter++
    if (logCounter % 33 === 0) {
      console.log(`[NoiseGate] dB: ${db.toFixed(1)} | gate: ${gainNode.gain.value === 1 ? "OPEN" : "CLOSED"} | threshold: ${thresholdDb}`)
    }

    if (db > thresholdDb) {
      // Voice detected — open the gate immediately
      gainNode.gain.value = 1
      if (holdTimer) {
        clearTimeout(holdTimer)
        holdTimer = null
      }
    } else if (gainNode.gain.value === 1 && !holdTimer) {
      // Below threshold but gate is open — start hold timer
      holdTimer = setTimeout(() => {
        gainNode.gain.value = 0
        holdTimer = null
      }, holdMs)
    }
  }, 30) // Check every 30ms for fast response

  return {
    ctx,
    source,
    analyser,
    gainNode,
    destination,
    interval,
    holdTimer,
    micStream,
    originalSenderTrack: micStream.getAudioTracks()[0], // placeholder, overwritten by caller
    gatedStream: destination.stream,
  }
}

function destroyNoiseGate(gate: NoiseGateState | null) {
  if (!gate) return
  clearInterval(gate.interval)
  if (gate.holdTimer) clearTimeout(gate.holdTimer)
  try { gate.source.disconnect() } catch {}
  try { gate.analyser.disconnect() } catch {}
  try { gate.gainNode.disconnect() } catch {}
  try { gate.ctx.close() } catch {}
  // Stop the fresh mic stream we acquired
  try { gate.micStream.getTracks().forEach((t) => t.stop()) } catch {}
}

export interface UseTelnyxWebRTCReturn {
  callState: CallState
  callDuration: number
  isReady: boolean
  error: string | null
  isMuted: boolean
  makeCall: (phoneNumber: string) => void
  hangUp: () => void
  toggleMute: () => void
  /** Reset callState back to "idle" — call after showing "Call Ended" briefly */
  setCallStateIdle: () => void
  /** Ref to the remote audio MediaStream (callee's voice) — set when call connects */
  remoteStreamRef: React.RefObject<MediaStream | null>
  /** Available audio input devices */
  audioInputDevices: AudioDevice[]
  /** Currently selected input device ID */
  selectedInputDeviceId: string | null
  /** Change the audio input device */
  setInputDevice: (deviceId: string) => void
  /** Refresh device list */
  refreshDevices: () => void
  /** Whether the noise gate is enabled */
  noiseGateEnabled: boolean
  /** Toggle noise gate on/off */
  setNoiseGateEnabled: (enabled: boolean) => void
}

/**
 * Kill ALL audio from a Telnyx call object at every possible layer.
 * Chrome plays audio from RTCPeerConnection receivers automatically —
 * just nulling the <audio> srcObject is NOT enough.
 */
function nukeCallAudio(call: any) {
  if (!call) return

  // 1. Disable + stop tracks on call.remoteStream
  try {
    if (call.remoteStream) {
      ;(call.remoteStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = false
        t.stop()
      })
    }
  } catch {}

  // 2. Disable + stop all receiver tracks on the peer connection
  //    This is what actually stops Chrome from playing audio.
  try {
    const pc: RTCPeerConnection | null = call.peer?.instance ?? call.peerConnection ?? null
    if (pc) {
      pc.getReceivers().forEach((r: RTCRtpReceiver) => {
        if (r.track) {
          r.track.enabled = false
          r.track.stop()
        }
      })
      pc.getSenders().forEach((s: RTCRtpSender) => {
        if (s.track) {
          s.track.enabled = false
          s.track.stop()
        }
      })
      pc.close()
    }
  } catch {}

  // 3. Stop local stream tracks (microphone)
  try {
    if (call.localStream) {
      ;(call.localStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = false
        t.stop()
      })
    }
  } catch {}
}

/**
 * Mute remote audio tracks on a call's peer connection.
 * Sets track.enabled = false so Chrome doesn't play incoming audio.
 * Does NOT stop tracks (they can be re-enabled).
 */
function muteRemoteTracks(call: any) {
  if (!call) return
  try {
    if (call.remoteStream) {
      ;(call.remoteStream as MediaStream).getAudioTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = false
      })
    }
  } catch {}
  try {
    const pc: RTCPeerConnection | null = call.peer?.instance ?? call.peerConnection ?? null
    if (pc) {
      pc.getReceivers().forEach((r: RTCRtpReceiver) => {
        if (r.track && r.track.kind === "audio") {
          r.track.enabled = false
        }
      })
    }
  } catch {}
}

/**
 * Unmute remote audio tracks on a call's peer connection.
 */
function unmuteRemoteTracks(call: any) {
  if (!call) return
  try {
    if (call.remoteStream) {
      ;(call.remoteStream as MediaStream).getAudioTracks().forEach((t: MediaStreamTrack) => {
        t.enabled = true
      })
    }
  } catch {}
  try {
    const pc: RTCPeerConnection | null = call.peer?.instance ?? call.peerConnection ?? null
    if (pc) {
      pc.getReceivers().forEach((r: RTCRtpReceiver) => {
        if (r.track && r.track.kind === "audio") {
          r.track.enabled = true
        }
      })
    }
  } catch {}
}

/**
 * Telnyx WebRTC Hook — browser-based calling via @telnyx/webrtc SDK
 *
 * Uses JWT authentication: the server generates a fresh token from a
 * telephony_credential, and the client uses `login_token` to connect.
 */
export function useTelnyxWebRTC(): UseTelnyxWebRTCReturn {
  const [callState, setCallState] = useState<CallState>("idle")
  const [callDuration, setCallDuration] = useState(0)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [audioInputDevices, setAudioInputDevices] = useState<AudioDevice[]>([])
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string | null>(null)
  const [noiseGateEnabled, setNoiseGateEnabled] = useState(true) // ON by default

  const clientRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const callerIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const callStateRef = useRef<CallState>("idle")
  const noiseGateRef = useRef<NoiseGateState | null>(null)
  const noiseGateEnabledRef = useRef(true) // sync ref for use in callbacks

  // ─── Ringback tone (synthetic North American ringback: 440+480 Hz) ────────
  const ringbackCtxRef = useRef<AudioContext | null>(null)
  const ringbackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopRingback = useCallback(() => {
    if (ringbackIntervalRef.current) {
      clearInterval(ringbackIntervalRef.current)
      ringbackIntervalRef.current = null
    }
    if (ringbackCtxRef.current) {
      try { ringbackCtxRef.current.close() } catch {}
      ringbackCtxRef.current = null
    }
  }, [])

  const startRingback = useCallback(() => {
    stopRingback() // clear any existing
    try {
      const ctx = new AudioContext()
      ringbackCtxRef.current = ctx

      const playTone = () => {
        if (ctx.state === "closed") return
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()
        osc1.frequency.value = 440
        osc2.frequency.value = 480
        gain.gain.value = 0.08
        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)
        osc1.start()
        osc2.start()
        osc1.stop(ctx.currentTime + 2)
        osc2.stop(ctx.currentTime + 2)
      }

      // Play immediately, then every 6s (2s tone + 4s silence)
      playTone()
      ringbackIntervalRef.current = setInterval(playTone, 6000)
    } catch (e) {
      console.warn("[Telnyx] Ringback tone failed:", e)
    }
  }, [stopRingback])

  // Kill the audio element + ringback — stops sound from OUR playback
  const killAudio = useCallback(() => {
    stopRingback()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.srcObject = null
    }
  }, [stopRingback])

  // Full audio nuke: kill audio element + kill all audio on a call object
  const killEverything = useCallback((call: any) => {
    killAudio()
    if (remoteStreamRef.current) {
      try { remoteStreamRef.current.getTracks().forEach((t) => { t.enabled = false; t.stop() }) } catch {}
      remoteStreamRef.current = null
    }
    nukeCallAudio(call)
  }, [killAudio])

  // Update both the React state and the synchronous ref
  const updateCallState = useCallback((newState: CallState) => {
    callStateRef.current = newState
    setCallState(newState)
  }, [])

  // Enumerate audio input devices
  const refreshDevices = useCallback(async () => {
    try {
      // Need permission first to get labels
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) => s.getTracks().forEach((t) => t.stop()))
      const devices = await navigator.mediaDevices.enumerateDevices()
      const inputs = devices
        .filter((d) => d.kind === "audioinput" && d.deviceId)
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 8)}` }))
      setAudioInputDevices(inputs)
      // If no device selected yet, pick default
      if (!selectedInputDeviceId && inputs.length > 0) {
        const def = inputs.find((d) => d.deviceId === "default") || inputs[0]
        setSelectedInputDeviceId(def.deviceId)
      }
    } catch (e) {
      console.warn("[Telnyx] Could not enumerate audio devices:", e)
    }
  }, [selectedInputDeviceId])

  // Set audio input device on Telnyx client
  const setInputDevice = useCallback((deviceId: string) => {
    setSelectedInputDeviceId(deviceId)
    const client = clientRef.current
    if (client) {
      try {
        const device = audioInputDevices.find((d) => d.deviceId === deviceId)
        client.setAudioSettings({
          micId: deviceId,
          micLabel: device?.label || "",
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }).catch(() => {})
      } catch {}
    }
    // If there's an active call, switch the mic on it too
    if (callRef.current) {
      try { callRef.current.setAudioInDevice(deviceId) } catch {}
    }
  }, [audioInputDevices])

  // Enumerate devices on mount
  useEffect(() => { refreshDevices() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Create a hidden audio element for remote audio
  useEffect(() => {
    if (typeof window !== "undefined" && !audioRef.current) {
      const audio = document.createElement("audio")
      audio.id = "telnyx-remote-audio"
      audio.autoplay = true
      document.body.appendChild(audio)
      audioRef.current = audio
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.srcObject = null
        audioRef.current.remove()
        audioRef.current = null
      }
    }
  }, [])

  const startTimer = useCallback(() => {
    callStartRef.current = Date.now()
    setCallDuration(0)
    durationRef.current = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartRef.current) / 1000))
    }, 1000)
  }, [])

  const stopTimer = useCallback(() => {
    if (durationRef.current) {
      clearInterval(durationRef.current)
      durationRef.current = null
    }
  }, [])

  // ─── Noise Gate: apply / remove on active calls ──────────────────────────
  const selectedInputDeviceIdRef = useRef<string | null>(null)
  useEffect(() => { selectedInputDeviceIdRef.current = selectedInputDeviceId }, [selectedInputDeviceId])

  const applyNoiseGate = useCallback(async (call: any) => {
    // Clean up any existing gate first
    destroyNoiseGate(noiseGateRef.current)
    noiseGateRef.current = null

    if (!noiseGateEnabledRef.current) return
    if (!call) return

    try {
      const pc: RTCPeerConnection | null = call.peer?.instance ?? call.peerConnection ?? null
      if (!pc) {
        console.warn("[NoiseGate] No peer connection found")
        return
      }

      const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "audio")
      if (!sender?.track) {
        console.warn("[NoiseGate] No audio sender track found")
        return
      }

      // Build audio constraints matching what we use for calls
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false,
      }
      const devId = selectedInputDeviceIdRef.current
      if (devId && devId !== "default") {
        audioConstraints.deviceId = { exact: devId }
      }

      // Create noise gate with a FRESH mic stream
      const gate = await createNoiseGate(audioConstraints, -35, 300)
      // Save the original sender track so we can restore it
      gate.originalSenderTrack = sender.track
      noiseGateRef.current = gate

      // Swap the sender's track with our gated output
      const gatedTrack = gate.gatedStream.getAudioTracks()[0]
      if (gatedTrack) {
        await sender.replaceTrack(gatedTrack)
        console.log("[NoiseGate] ✅ ACTIVE — fresh mic stream → gate → RTC sender")
      } else {
        console.warn("[NoiseGate] No gated track produced")
        destroyNoiseGate(gate)
        noiseGateRef.current = null
      }
    } catch (e) {
      console.warn("[NoiseGate] Setup failed:", e)
      destroyNoiseGate(noiseGateRef.current)
      noiseGateRef.current = null
    }
  }, [])

  const removeNoiseGate = useCallback(async (call: any) => {
    const gate = noiseGateRef.current
    if (!gate) return

    try {
      // Restore the original sender track
      const pc: RTCPeerConnection | null = call?.peer?.instance ?? call?.peerConnection ?? null
      if (pc && gate.originalSenderTrack && !gate.originalSenderTrack.readyState?.includes?.("ended")) {
        const sender = pc.getSenders().find((s: RTCRtpSender) => s.track?.kind === "audio")
        if (sender) {
          await sender.replaceTrack(gate.originalSenderTrack)
        }
      }
    } catch {}

    destroyNoiseGate(gate)
    noiseGateRef.current = null
    console.log("[NoiseGate] 🔊 REMOVED — mic always open")
  }, [])

  // Keep the ref in sync with state
  useEffect(() => {
    noiseGateEnabledRef.current = noiseGateEnabled
    // Noise gate currently disabled — letting mic hardware handle processing.
    // When re-enabled, this would apply/remove gate mid-call.
  }, [noiseGateEnabled])

  // Initialize Telnyx WebRTC client
  useEffect(() => {
    mountedRef.current = true

    async function init() {
      try {
        console.log("[Telnyx] Fetching WebRTC token...")
        const res = await fetch("/api/portal/dialer/webrtc-token")
        if (!res.ok) {
          const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
          console.error("[Telnyx] Token fetch failed:", data)
          setError(data.error || "Failed to get WebRTC token")
          return
        }
        const { login_token, callerIdNumber } = await res.json()

        if (!login_token) {
          setError("No WebRTC token received from server")
          return
        }

        console.log("[Telnyx] Token received, callerIdNumber:", callerIdNumber)
        callerIdRef.current = callerIdNumber || null

        const { TelnyxRTC } = await import("@telnyx/webrtc")
        console.log("[Telnyx] SDK loaded, creating client...")

        const client = new TelnyxRTC({ login_token })

        client.on("telnyx.ready", () => {
          if (mountedRef.current) {
            console.log("[Telnyx] ✅ WebRTC client READY")
            setIsReady(true)
            setError(null)
          }
        })

        client.on("telnyx.error", (err: any) => {
          console.error("[Telnyx] ❌ WebRTC error:", err)
          if (mountedRef.current) {
            setError(err?.message || "WebRTC connection error")
          }
        })

        client.on("telnyx.notification", (notification: any) => {
          const call = notification.call
          if (!call) return

          if (notification.type === "callUpdate") {
            handleCallState(call)
          } else if (notification.type === "userMediaError") {
            console.error("[Telnyx] 🎤 Microphone access denied")
            if (mountedRef.current) setError("Microphone access denied. Please allow mic access.")
          }
        })

        console.log("[Telnyx] Connecting...")
        client.connect()
        clientRef.current = client
      } catch (e) {
        console.error("[Telnyx] Init error:", e)
        if (mountedRef.current) {
          setError(e instanceof Error ? e.message : String(e))
        }
      }
    }

    function handleCallState(call: any) {
      if (!mountedRef.current) return

      const state = call.state
      console.log(`[Telnyx] 📞 Call state: ${state}`, {
        cause: call.cause,
        sipCode: call.sipCode,
        sipReason: call.sipReason,
        isCurrentCall: call === callRef.current,
      })

      // CRITICAL: Only process events from our current active call.
      // After hangUp() sets callRef to null, ALL events are blocked.
      // After makeCall() sets callRef to the new call, only new call events pass.
      if (call !== callRef.current) {
        console.log(`[Telnyx] ⚠️ Ignoring event "${state}" from stale/inactive call`)
        // EXTRA SAFETY: If a stale call is producing audio, nuke it
        if (state === "early" || state === "active" || state === "ringing") {
          nukeCallAudio(call)
          try { call.hangup() } catch {}
        }
        return
      }

      switch (state) {
        case "trying":
        case "requesting":
          // Immediately mute remote tracks — the peer connection may already exist
          // and Chrome will play any incoming audio automatically.
          muteRemoteTracks(call)
          updateCallState("connecting")
          break
        case "ringing":
        case "early":
          // CRITICAL: Mute remote audio at the peer connection level.
          // "early" state carries early media (voicemail greetings, carrier
          // announcements). Chrome plays RTCPeerConnection audio automatically
          // even without an <audio> element — track.enabled = false stops it.
          muteRemoteTracks(call)
          updateCallState("ringing")
          startRingback()
          break
        case "active":
          stopRingback()
          // NOW unmute — the call is actually answered by a human (or voicemail beep)
          unmuteRemoteTracks(call)
          // Attach remote audio to our audio element for playback
          if (call.remoteStream && audioRef.current) {
            audioRef.current.srcObject = call.remoteStream
            remoteStreamRef.current = call.remoteStream as MediaStream
          }
          // Noise gate disabled — let the mic hardware handle audio processing.
          // applyNoiseGate(call)
          updateCallState("connected")
          startTimer()
          break
        case "hangup":
        case "destroy":
        case "purge":
          console.log(`[Telnyx] ☎️ Call ended — cause=${call.cause}, sip=${call.sipCode}`)
          // Clean up noise gate before nuking
          destroyNoiseGate(noiseGateRef.current)
          noiseGateRef.current = null
          // CRITICAL: nuke ALL audio at every layer
          killAudio()
          stopTimer()
          nukeCallAudio(call)
          if (remoteStreamRef.current) {
            try { remoteStreamRef.current.getTracks().forEach((t) => { t.enabled = false; t.stop() }) } catch {}
          }
          callRef.current = null
          remoteStreamRef.current = null
          updateCallState("disconnected")
          break
      }
    }

    init()

    return () => {
      mountedRef.current = false
      destroyNoiseGate(noiseGateRef.current)
      noiseGateRef.current = null
      stopTimer()
      killAudio()
      stopRingback()
      if (callRef.current) {
        nukeCallAudio(callRef.current)
        try { callRef.current.hangup() } catch {}
      }
      if (clientRef.current) {
        try { clientRef.current.disconnect() } catch {}
      }
    }
  }, [startTimer, stopTimer, killAudio, stopRingback, startRingback, updateCallState])

  const makeCall = useCallback((phoneNumber: string) => {
    if (!clientRef.current || !isReady) {
      setError("WebRTC not ready — try refreshing the page")
      return
    }

    // Clean up noise gate from previous call
    destroyNoiseGate(noiseGateRef.current)
    noiseGateRef.current = null

    // CRITICAL: Kill ALL audio from any source before doing anything else.
    // This is the single most important line — no sound should survive past here.
    killEverything(callRef.current)
    stopTimer()

    // Clean up any existing call — hangup SIP session + destroy peer connection
    if (callRef.current) {
      console.log("[Telnyx] ⚠️ Cleaning up existing call before dialing new one")
      const oldCall = callRef.current
      callRef.current = null
      try { oldCall.hangup() } catch {}
      // nukeCallAudio already called via killEverything above
    } else {
      callRef.current = null
    }

    setError(null)
    updateCallState("connecting")
    setCallDuration(0)
    setIsMuted(false)

    // Format to E.164
    let formatted = phoneNumber.replace(/\D/g, "")
    if (formatted.length === 10) formatted = `+1${formatted}`
    else if (formatted.length === 11 && formatted.startsWith("1")) formatted = `+${formatted}`
    else if (!formatted.startsWith("+")) formatted = `+${formatted}`

    console.log("[Telnyx] 📞 Calling:", formatted)

    try {
      // Audio constraints — MINIMAL. Let the mic hardware handle processing.
      // Chrome's echoCancellation/noiseSuppression fight with external mics
      // (like the Hollyland Lark M2) causing distortion + amplified noise.
      // Google Voice works fine with this mic because it uses raw audio.
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
      }
      if (selectedInputDeviceId && selectedInputDeviceId !== "default") {
        audioConstraints.deviceId = { exact: selectedInputDeviceId }
      }

      const call = clientRef.current.newCall({
        destinationNumber: formatted,
        callerIdNumber: callerIdRef.current || undefined,
        audio: audioConstraints,
        video: false,
      })
      callRef.current = call
      // Immediately mute remote tracks on the new call — don't let any early
      // media play until we explicitly unmute in the "active" handler
      muteRemoteTracks(call)
    } catch (e) {
      console.error("[Telnyx] Call failed:", e)
      setError(e instanceof Error ? e.message : "Failed to initiate call")
      updateCallState("idle")
    }
  }, [isReady, updateCallState, killEverything, stopTimer])

  const hangUp = useCallback(() => {
    console.log("[Telnyx] 🔴 Hanging up...")

    // Clean up noise gate first (before nuking peer connection)
    destroyNoiseGate(noiseGateRef.current)
    noiseGateRef.current = null

    const call = callRef.current
    callRef.current = null
    remoteStreamRef.current = null

    // Nuke ALL audio at every layer — audio element, remote stream, peer connection
    killEverything(call)
    stopTimer()

    if (call) {
      try { call.hangup() } catch (e) { console.error("[Telnyx] Hangup error:", e) }
    }

    updateCallState("disconnected")
    setIsMuted(false)
  }, [killEverything, stopTimer, updateCallState])

  const toggleMute = useCallback(() => {
    if (callRef.current) {
      if (isMuted) {
        callRef.current.unmuteAudio()
      } else {
        callRef.current.muteAudio()
      }
      setIsMuted(!isMuted)
    }
  }, [isMuted])

  const setCallStateIdle = useCallback(() => {
    updateCallState("idle")
    setCallDuration(0)
  }, [updateCallState])

  return {
    callState,
    callDuration,
    isReady,
    error,
    isMuted,
    makeCall,
    hangUp,
    toggleMute,
    setCallStateIdle,
    remoteStreamRef,
    audioInputDevices,
    selectedInputDeviceId,
    setInputDevice,
    refreshDevices,
    noiseGateEnabled,
    setNoiseGateEnabled,
  }
}
