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
  const callerIdRef = useRef<string | null>(null)

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
    let mounted = true

    async function init() {
      try {
        // Fetch JWT token from our API
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

        // Dynamically import to avoid SSR issues
        const { TelnyxRTC } = await import("@telnyx/webrtc")
        console.log("[Telnyx] SDK loaded, creating client...")

        const client = new TelnyxRTC({
          login_token,
        })

        client.on("telnyx.ready", () => {
          if (mounted) {
            console.log("[Telnyx] ✅ WebRTC client READY — can make calls")
            setIsReady(true)
            setError(null)
          }
        })

        client.on("telnyx.error", (err: any) => {
          console.error("[Telnyx] ❌ WebRTC error:", JSON.stringify(err, null, 2))
          if (mounted) {
            setError(err?.message || "WebRTC connection error")
          }
        })

        client.on("telnyx.socket.open", () => {
          console.log("[Telnyx] 🔌 WebSocket opened")
        })

        client.on("telnyx.socket.close", (ev: any) => {
          console.log("[Telnyx] 🔌 WebSocket closed:", ev?.code, ev?.reason)
        })

        client.on("telnyx.socket.error", (ev: any) => {
          console.error("[Telnyx] 🔌 WebSocket error:", ev)
        })

        client.on("telnyx.notification", (notification: any) => {
          console.log("[Telnyx] 📡 Notification:", notification.type, 
            notification.call ? `state=${notification.call.state}` : "(no call)")

          const call = notification.call

          if (!call) return

          switch (notification.type) {
            case "callUpdate":
              handleCallState(call)
              break
            case "userMediaError":
              console.error("[Telnyx] 🎤 Microphone access denied")
              if (mounted) setError("Microphone access denied. Please allow mic access.")
              break
          }
        })

        console.log("[Telnyx] Connecting to Telnyx servers...")
        client.connect()
        clientRef.current = client
      } catch (e) {
        console.error("[Telnyx] WebRTC init error:", e)
        if (mounted) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
      }
    }

    function handleCallState(call: any) {
      if (!mounted) return
      
      const state = call.state
      console.log(`[Telnyx] 📞 Call state: ${state}`, {
        cause: call.cause,
        causeCode: call.causeCode,
        sipCode: call.sipCode,
        sipReason: call.sipReason,
        direction: call.direction,
        id: call.id,
      })

      // Attach remote audio stream
      if (call.remoteStream && audioRef.current) {
        audioRef.current.srcObject = call.remoteStream
        console.log("[Telnyx] 🔊 Remote audio stream attached")
      }

      switch (state) {
        case "new":
          console.log("[Telnyx] New call created")
          break
        case "trying":
        case "requesting":
          setCallState("connecting")
          break
        case "ringing":
        case "early":
          setCallState("ringing")
          break
        case "active":
          setCallState("connected")
          startTimer()
          break
        case "hangup":
        case "destroy":
        case "purge":
          console.log(`[Telnyx] ☎️ Call ended: state=${state}, cause=${call.cause}, causeCode=${call.causeCode}, sipCode=${call.sipCode}, sipReason=${call.sipReason}`)
          setCallState("disconnected")
          stopTimer()
          callRef.current = null
          // Reset to idle after a brief delay so the UI can show "Call Ended"
          setTimeout(() => {
            if (mounted) setCallState("idle")
          }, 3000)
          break
        default:
          console.log(`[Telnyx] Unhandled call state: ${state}`)
      }
    }

    init()

    return () => {
      mounted = false
      stopTimer()
      if (callRef.current) {
        try { callRef.current.hangup() } catch {}
      }
      if (clientRef.current) {
        try { clientRef.current.disconnect() } catch {}
      }
    }
  }, [startTimer, stopTimer])

  const makeCall = useCallback((phoneNumber: string) => {
    if (!clientRef.current || !isReady) {
      console.error("[Telnyx] makeCall failed: client exists?", !!clientRef.current, "isReady?", isReady)
      setError("WebRTC not ready — try refreshing the page")
      return
    }

    setError(null)
    setCallState("connecting")
    setCallDuration(0)
    setIsMuted(false)

    // Format to E.164
    let formatted = phoneNumber.replace(/\D/g, "")
    if (formatted.length === 10) formatted = `+1${formatted}`
    else if (formatted.length === 11 && formatted.startsWith("1")) formatted = `+${formatted}`
    else if (!formatted.startsWith("+")) formatted = `+${formatted}`

    console.log("[Telnyx] 📞 Making call to:", formatted, "from:", callerIdRef.current)

    try {
      const call = clientRef.current.newCall({
        destinationNumber: formatted,
        callerIdNumber: callerIdRef.current || undefined,
        audio: true,
        video: false,
      })
      callRef.current = call
      console.log("[Telnyx] Call object created:", call?.id)
    } catch (e) {
      console.error("[Telnyx] Failed to make call:", e)
      setError(e instanceof Error ? e.message : "Failed to initiate call")
      setCallState("idle")
    }
  }, [isReady])

  const hangUp = useCallback(() => {
    if (callRef.current) {
      try {
        callRef.current.hangup()
      } catch (e) {
        console.error("[Telnyx] Hangup error:", e)
      }
      callRef.current = null
    }
    setCallState("disconnected")
    stopTimer()
  }, [stopTimer])

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

  return {
    callState,
    callDuration,
    isReady,
    error,
    isMuted,
    makeCall,
    hangUp,
    toggleMute,
  }
}
