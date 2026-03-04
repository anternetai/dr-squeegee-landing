"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export type SessionRecordingState =
  | "idle"
  | "waiting-screen"
  | "recording"
  | "stopping"
  | "uploading"
  | "done"
  | "error"

interface UseSessionRecordingOptions {
  /** Ref to webcam video stream (from WebcamPiP) */
  webcamStreamRef: React.RefObject<MediaStream | null>
  /** Ref to webcam canvas (for blur composited frames) */
  webcamCanvasRef: React.RefObject<HTMLCanvasElement | null>
  /** Ref to mixed audio stream (mic + remote, from useMixedAudioRecording) */
  mixedAudioStreamRef: React.RefObject<MediaStream | null>
  /** Lead ID and call history ID for organizing the upload */
  leadId?: string
  callHistoryId?: string
}

export type WebcamCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right"

interface UseSessionRecordingReturn {
  state: SessionRecordingState
  durationMs: number
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<void>
  /** Live compositing canvas ref — render this for recording preview */
  previewCanvasRef: React.RefObject<HTMLCanvasElement | null>
  /** Which corner the webcam overlay sits in */
  webcamCorner: WebcamCorner
  setWebcamCorner: (corner: WebcamCorner) => void
}

const WEBCAM_SIZE = 200 // pixels for the round webcam overlay

/**
 * useSessionRecording — captures screen + webcam overlay + both-sides audio.
 *
 * Flow:
 * 1. Start → prompt for screen share (getDisplayMedia)
 * 2. Composite screen + webcam on a canvas at 30fps
 * 3. Record canvas stream + mixed audio via MediaRecorder
 * 4. On stop → upload to Supabase Storage via signed URL
 * 5. Toggle `recording-active` class on body for PII blur
 */
export function useSessionRecording({
  webcamStreamRef,
  webcamCanvasRef,
  mixedAudioStreamRef,
  leadId,
  callHistoryId,
}: UseSessionRecordingOptions): UseSessionRecordingReturn {
  const [state, setState] = useState<SessionRecordingState>("idle")
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [webcamCorner, setWebcamCorner] = useState<WebcamCorner>("bottom-right")

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startTimeRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const screenStreamRef = useRef<MediaStream | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const animFrameRef = useRef<number>(0)
  const screenVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null)
  const webcamCornerRef = useRef<WebcamCorner>(webcamCorner)

  // Keep ref in sync with state so draw loop reads latest value
  webcamCornerRef.current = webcamCorner

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop())
      }
      document.body.classList.remove("recording-active")
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setState("waiting-screen")

      // 1. Prompt for screen share
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: false, // we use our own mixed audio
      })
      screenStreamRef.current = screenStream

      // Handle user stopping screen share via browser UI
      screenStream.getVideoTracks()[0].addEventListener("ended", () => {
        stopRecordingInternal()
      })

      // 2. Create hidden video element for screen
      const screenVideo = document.createElement("video")
      screenVideo.srcObject = screenStream
      screenVideo.muted = true
      screenVideo.playsInline = true
      await screenVideo.play()
      screenVideoRef.current = screenVideo

      // 3. Create compositing canvas
      const canvas = document.createElement("canvas")
      canvas.width = screenVideo.videoWidth || 1920
      canvas.height = screenVideo.videoHeight || 1080
      canvasRef.current = canvas
      const ctx = canvas.getContext("2d")!

      // 4. Animation loop: draw screen + webcam overlay
      const drawFrame = () => {
        if (!screenVideoRef.current) return

        // Update canvas size if screen resolution changes
        if (canvas.width !== screenVideo.videoWidth || canvas.height !== screenVideo.videoHeight) {
          canvas.width = screenVideo.videoWidth || 1920
          canvas.height = screenVideo.videoHeight || 1080
        }

        // Draw screen capture
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)

        // Draw webcam overlay
        const webcamCanvas = webcamCanvasRef.current
        const webcamStream = webcamStreamRef.current

        // Prefer blur-composited canvas, fallback to raw video element from stream
        let webcamSource: CanvasImageSource | null = null
        if (webcamCanvas && webcamCanvas.width > 0 && webcamCanvas.height > 0) {
          webcamSource = webcamCanvas
        } else if (webcamStream && webcamStream.active) {
          // Create or reuse a hidden video element for the webcam stream
          if (!webcamVideoRef.current) {
            const wv = document.createElement("video")
            wv.srcObject = webcamStream
            wv.muted = true
            wv.playsInline = true
            wv.play().catch(() => {})
            webcamVideoRef.current = wv
          }
          if (webcamVideoRef.current.videoWidth > 0) {
            webcamSource = webcamVideoRef.current
          }
        }

        if (webcamSource) {
          const size = WEBCAM_SIZE
          const margin = 20
          const corner = webcamCornerRef.current
          const x = corner.includes("right") ? canvas.width - size - margin : margin
          const y = corner.includes("bottom") ? canvas.height - size - margin : margin

          ctx.save()
          // Round clip
          ctx.beginPath()
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
          ctx.closePath()
          ctx.clip()
          // Draw webcam scaled to fit circle
          ctx.drawImage(webcamSource, x, y, size, size)
          ctx.restore()

          // Border ring
          ctx.beginPath()
          ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2)
          ctx.strokeStyle = "rgba(255,255,255,0.3)"
          ctx.lineWidth = 2
          ctx.stroke()
        }

        animFrameRef.current = requestAnimationFrame(drawFrame)
      }

      animFrameRef.current = requestAnimationFrame(drawFrame)

      // 5. Create MediaRecorder from canvas stream + audio
      const canvasStream = canvas.captureStream(30)

      // Add mixed audio tracks if available
      const mixedStream = mixedAudioStreamRef.current
      if (mixedStream) {
        for (const track of mixedStream.getAudioTracks()) {
          canvasStream.addTrack(track)
        }
      }

      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
          ? "video/webm;codecs=vp8,opus"
          : "video/webm"

      const recorder = new MediaRecorder(canvasStream, {
        mimeType,
        videoBitsPerSecond: 2_500_000, // 2.5 Mbps
      })
      chunksRef.current = []
      startTimeRef.current = Date.now()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start(1000)
      mediaRecorderRef.current = recorder

      // 6. Toggle PII blur
      document.body.classList.add("recording-active")

      // 7. Start timer
      setDurationMs(0)
      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTimeRef.current)
      }, 1000)

      setState("recording")
    } catch (e) {
      console.error("[SessionRecording] Start failed:", e)
      // User cancelled screen share prompt
      if (e instanceof DOMException && e.name === "NotAllowedError") {
        setState("idle")
        return
      }
      setError(e instanceof Error ? e.message : "Failed to start session recording")
      setState("error")
    }
  }, [webcamStreamRef, webcamCanvasRef, mixedAudioStreamRef])

  const stopRecordingInternal = useCallback(async () => {
    setState("stopping")

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Stop animation loop
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
      animFrameRef.current = 0
    }

    // Remove PII blur
    document.body.classList.remove("recording-active")

    // Stop MediaRecorder
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive") {
      cleanup()
      setState("idle")
      return
    }

    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" })
        resolve(b)
      }
      recorder.stop()
    })

    cleanup()

    if (blob.size === 0) {
      setState("idle")
      return
    }

    // Upload
    setState("uploading")
    try {
      const ext = blob.type.includes("mp4") ? "mp4" : "webm"
      const filename = `session_${Date.now()}.${ext}`

      // 1. Get signed URL
      const urlRes = await fetch("/api/portal/calls/upload-video-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename,
          contentType: blob.type,
          leadId,
          callHistoryId,
        }),
      })

      if (!urlRes.ok) throw new Error("Failed to get upload URL")
      const { signedUrl, storagePath } = await urlRes.json()

      // 2. Upload directly to Supabase Storage
      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": blob.type },
        body: blob,
      })

      if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`)

      console.log("[SessionRecording] Uploaded to:", storagePath)
      setState("done")

      // Auto-reset after 3s
      setTimeout(() => setState("idle"), 3000)
    } catch (e) {
      console.error("[SessionRecording] Upload failed:", e)
      setError(e instanceof Error ? e.message : "Upload failed")
      setState("error")
    }
  }, [leadId, callHistoryId])

  function cleanup() {
    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop())
      screenStreamRef.current = null
    }
    // Remove screen video element
    if (screenVideoRef.current) {
      screenVideoRef.current.pause()
      screenVideoRef.current.srcObject = null
      screenVideoRef.current = null
    }
    // Remove webcam video element
    if (webcamVideoRef.current) {
      webcamVideoRef.current.pause()
      webcamVideoRef.current.srcObject = null
      webcamVideoRef.current = null
    }
    mediaRecorderRef.current = null
  }

  const stopRecording = useCallback(async () => {
    await stopRecordingInternal()
  }, [stopRecordingInternal])

  return {
    state,
    durationMs,
    error,
    startRecording,
    stopRecording,
    previewCanvasRef: canvasRef,
    webcamCorner,
    setWebcamCorner,
  }
}
