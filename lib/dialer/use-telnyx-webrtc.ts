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
 * The user's browser becomes the phone. Audio goes through their
 * laptop mic/speakers or headset. No external phone needed.
 * 
 * Requires: TELNYX_SIP_USERNAME and TELNYX_SIP_PASSWORD from the
 * credential connection created in the Telnyx portal.
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
        // Fetch credentials from our API
        const res = await fetch("/api/portal/dialer/webrtc-token")
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Failed to get WebRTC credentials")
          return
        }
        const { login, password, callerIdNumber } = await res.json()

        // Dynamically import to avoid SSR issues
        const { TelnyxRTC } = await import("@telnyx/webrtc")

        const client = new TelnyxRTC({
          login,
          password,
          ringtoneFile: undefined,
          ringbackFile: undefined,
        })

        client.on("telnyx.ready", () => {
          if (mounted) {
            setIsReady(true)
            setError(null)
          }
        })

        client.on("telnyx.error", (err: any) => {
          console.error("Telnyx WebRTC error:", err)
          if (mounted) {
            setError(err?.message || "WebRTC connection error")
          }
        })

        client.on("telnyx.notification", (notification: any) => {
          const call = notification.call

          if (!call) return

          switch (notification.type) {
            case "callUpdate":
              handleCallState(call)
              break
            case "userMediaError":
              if (mounted) setError("Microphone access denied. Please allow mic access.")
              break
          }
        })

        // Store caller ID for outbound calls
        ;(client as any)._hfhCallerId = callerIdNumber

        client.connect()
        clientRef.current = client
      } catch (e) {
        console.error("Telnyx WebRTC init error:", e)
        if (mounted) {
          const msg = e instanceof Error ? e.message : String(e)
          setError(msg)
        }
      }
    }

    function handleCallState(call: any) {
      if (!mounted) return
      
      const state = call.state

      // Attach remote audio stream
      if (call.remoteStream && audioRef.current) {
        audioRef.current.srcObject = call.remoteStream
      }

      switch (state) {
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
          setCallState("disconnected")
          stopTimer()
          callRef.current = null
          break
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
      setError("WebRTC not ready")
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

    const callerIdNumber = (clientRef.current as any)._hfhCallerId || undefined

    try {
      const call = clientRef.current.newCall({
        destinationNumber: formatted,
        callerIdNumber,
        audio: true,
        video: false,
      })
      callRef.current = call
    } catch (e) {
      console.error("Failed to make call:", e)
      setError(e instanceof Error ? e.message : "Failed to initiate call")
      setCallState("idle")
    }
  }, [isReady])

  const hangUp = useCallback(() => {
    if (callRef.current) {
      try {
        callRef.current.hangup()
      } catch (e) {
        console.error("Hangup error:", e)
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

  // Cleanup
  useEffect(() => {
    return () => {
      stopTimer()
    }
  }, [stopTimer])

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
