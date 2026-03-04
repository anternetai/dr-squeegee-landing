"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { CallState } from "./types"

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

  const clientRef = useRef<any>(null)
  const callRef = useRef<any>(null)
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const callStartRef = useRef<number>(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const callerIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)
  const callStateRef = useRef<CallState>("idle")

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

  // Kill the audio element — stops all sound immediately
  const killAudio = useCallback(() => {
    stopRingback()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.srcObject = null
    }
  }, [stopRingback])

  // Update both the React state and the synchronous ref
  const updateCallState = useCallback((newState: CallState) => {
    callStateRef.current = newState
    setCallState(newState)
  }, [])

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
      // This prevents stale destroy/purge events from overriding the next call's state.
      if (call !== callRef.current) {
        console.log(`[Telnyx] ⚠️ Ignoring event "${state}" from stale/inactive call`)
        return
      }

      // Attach remote audio stream when available
      if (call.remoteStream && audioRef.current) {
        audioRef.current.srcObject = call.remoteStream
        remoteStreamRef.current = call.remoteStream as MediaStream
      }

      switch (state) {
        case "trying":
        case "requesting":
          updateCallState("connecting")
          break
        case "ringing":
        case "early":
          updateCallState("ringing")
          startRingback()
          break
        case "active":
          stopRingback()
          updateCallState("connected")
          startTimer()
          break
        case "hangup":
        case "destroy":
        case "purge":
          console.log(`[Telnyx] ☎️ Call ended — cause=${call.cause}, sip=${call.sipCode}`)
          // CRITICAL: kill audio immediately so user doesn't hear anything
          killAudio()
          stopTimer()
          callRef.current = null
          remoteStreamRef.current = null
          updateCallState("disconnected")
          break
      }
    }

    init()

    return () => {
      mountedRef.current = false
      stopTimer()
      killAudio()
      stopRingback()
      if (callRef.current) {
        try { callRef.current.hangup() } catch {}
      }
      if (clientRef.current) {
        try { clientRef.current.disconnect() } catch {}
      }
    }
  }, [startTimer, stopTimer, killAudio, stopRingback, startRingback])

  const makeCall = useCallback((phoneNumber: string) => {
    if (!clientRef.current || !isReady) {
      setError("WebRTC not ready — try refreshing the page")
      return
    }

    // CRITICAL: Always clean up any existing call before starting a new one.
    // This prevents overlapping calls where two audio streams play simultaneously.
    if (callRef.current) {
      console.log("[Telnyx] ⚠️ Cleaning up existing call before dialing new one")
      killAudio()
      stopTimer()
      const oldCall = callRef.current
      callRef.current = null
      try { oldCall.hangup() } catch {}
      try {
        if (oldCall.peer?.instance) {
          const pc = oldCall.peer.instance as RTCPeerConnection
          pc.getSenders().forEach((s: RTCRtpSender) => { if (s.track) s.track.stop() })
          pc.getReceivers().forEach((r: RTCRtpReceiver) => { if (r.track) r.track.stop() })
          pc.close()
        }
      } catch {}
      try {
        if (oldCall.localStream) {
          (oldCall.localStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => t.stop())
        }
      } catch {}
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
      const call = clientRef.current.newCall({
        destinationNumber: formatted,
        callerIdNumber: callerIdRef.current || undefined,
        audio: true,
        video: false,
      })
      callRef.current = call
    } catch (e) {
      console.error("[Telnyx] Call failed:", e)
      setError(e instanceof Error ? e.message : "Failed to initiate call")
      updateCallState("idle")
    }
  }, [isReady, updateCallState, killAudio, stopTimer])

  const hangUp = useCallback(() => {
    console.log("[Telnyx] 🔴 Hanging up...")
    
    // 1. Kill audio FIRST — stop all sound immediately
    killAudio()
    
    // 2. Stop the timer
    stopTimer()
    
    // 3. Tell the SDK to hang up the SIP session
    const call = callRef.current
    callRef.current = null
    remoteStreamRef.current = null
    
    if (call) {
      try {
        // The SDK hangup() sends a SIP BYE
        call.hangup()
      } catch (e) {
        console.error("[Telnyx] Hangup error:", e)
      }
      
      // Also try to stop all media tracks on the call's peer connection
      try {
        if (call.peer?.instance) {
          const pc = call.peer.instance as RTCPeerConnection
          pc.getSenders().forEach((sender: RTCRtpSender) => {
            if (sender.track) sender.track.stop()
          })
          pc.getReceivers().forEach((receiver: RTCRtpReceiver) => {
            if (receiver.track) receiver.track.stop()
          })
          pc.close()
        }
      } catch {}
      
      // Try stopping local stream tracks
      try {
        if (call.localStream) {
          (call.localStream as MediaStream).getTracks().forEach((t: MediaStreamTrack) => t.stop())
        }
      } catch {}
    }
    
    // 4. Update state
    updateCallState("disconnected")
    setIsMuted(false)
  }, [killAudio, stopTimer, updateCallState])

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
  }
}
