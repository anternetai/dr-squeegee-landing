"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import type { RecordingState } from "./ai-types"

interface UseMixedAudioRecordingOptions {
  /** Ref to the remote audio stream (callee's voice) from Telnyx */
  remoteStreamRef: React.RefObject<MediaStream | null>
  /** Ref to the local audio stream (agent's mic) from Telnyx — avoids opening a competing mic */
  localStreamRef?: React.RefObject<MediaStream | null>
}

interface UseMixedAudioRecordingReturn {
  recordingState: RecordingState
  durationMs: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  reset: () => void
  /** The mixed audio stream (mic + remote) — session recorder can tap this */
  mixedStreamRef: React.RefObject<MediaStream | null>
}

/**
 * useMixedAudioRecording — captures BOTH sides of a phone call.
 *
 * Uses Web Audio API to mix:
 *   1. Local microphone (agent's voice)
 *   2. Remote stream from Telnyx (callee's voice)
 *
 * The mixed stream is recorded via MediaRecorder and also exposed
 * via `mixedStreamRef` so the session video recorder can share the audio track.
 */
export function useMixedAudioRecording({
  remoteStreamRef,
  localStreamRef,
}: UseMixedAudioRecordingOptions): UseMixedAudioRecordingReturn {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [durationMs, setDurationMs] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const ownsMicStreamRef = useRef(false) // true = we opened getUserMedia, false = shared from Telnyx
  const mixedStreamRef = useRef<MediaStream | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        try { audioCtxRef.current.close() } catch {}
      }
      // Only stop mic stream if we own it (not Telnyx's)
      if (micStreamRef.current && ownsMicStreamRef.current) {
        micStreamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      // 1. Get microphone — prefer Telnyx's existing local stream to avoid
      //    opening a competing mic that causes distortion/dropout.
      let micStream: MediaStream
      let ownsStream = false // track whether we need to stop this stream ourselves
      if (localStreamRef?.current && localStreamRef.current.active && localStreamRef.current.getAudioTracks().length > 0) {
        micStream = localStreamRef.current
        ownsStream = false // Telnyx owns this stream, don't stop it
        console.log("[MixedRecording] Using Telnyx local stream (no duplicate mic)")
      } else {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        ownsStream = true
        console.log("[MixedRecording] Fallback: opened own mic stream")
      }
      micStreamRef.current = micStream
      ownsMicStreamRef.current = ownsStream

      // 2. Create AudioContext and mix streams
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const destination = ctx.createMediaStreamDestination()

      // Add mic
      const micSource = ctx.createMediaStreamSource(micStream)
      micSource.connect(destination)

      // Add remote audio if available (may arrive later — we poll briefly)
      let remoteConnected = false
      const tryConnectRemote = () => {
        if (remoteConnected) return
        const remote = remoteStreamRef.current
        if (remote && remote.getAudioTracks().length > 0) {
          try {
            const remoteSource = ctx.createMediaStreamSource(remote)
            remoteSource.connect(destination)
            remoteConnected = true
            console.log("[MixedRecording] Remote audio connected to mix")
          } catch (e) {
            console.warn("[MixedRecording] Failed to connect remote:", e)
          }
        }
      }

      // Try immediately
      tryConnectRemote()

      // Poll for remote stream for up to 10s (it arrives after "connecting" → "active")
      if (!remoteConnected) {
        const pollInterval = setInterval(() => {
          tryConnectRemote()
          if (remoteConnected) clearInterval(pollInterval)
        }, 500)
        // Stop polling after 10s
        setTimeout(() => clearInterval(pollInterval), 10000)
      }

      // 3. The mixed output stream
      const mixedStream = destination.stream
      mixedStreamRef.current = mixedStream

      // 4. Record the mixed stream
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg"

      const recorder = new MediaRecorder(mixedStream, { mimeType })
      chunksRef.current = []
      startTimeRef.current = Date.now()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(1000) // chunk every second
      mediaRecorderRef.current = recorder
      setRecordingState("recording")
      setDurationMs(0)

      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 1000)
    } catch (e) {
      console.error("[MixedRecording] Start failed:", e)
      setRecordingState("error")
    }
  }, [remoteStreamRef])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      // Stop timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === "inactive") {
        setRecordingState("idle")
        resolve(null)
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        })

        // Clean up mic stream — only stop if WE opened it (not Telnyx's stream)
        if (micStreamRef.current) {
          if (ownsMicStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop())
          }
          micStreamRef.current = null
        }

        // Close audio context
        if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
          try { audioCtxRef.current.close() } catch {}
          audioCtxRef.current = null
        }

        mixedStreamRef.current = null
        setRecordingState("stopped")
        resolve(blob)
      }

      recorder.stop()
    })
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordingState("idle")
    setDurationMs(0)
    chunksRef.current = []
  }, [])

  return {
    recordingState,
    durationMs,
    startRecording,
    stopRecording,
    reset,
    mixedStreamRef,
  }
}
