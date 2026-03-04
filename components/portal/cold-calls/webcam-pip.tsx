"use client"

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import { Video, VideoOff, Minus, GripHorizontal, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "webcam-pip-prefs"

interface PiPPrefs {
  enabled: boolean
  minimized: boolean
  position: { x: number; y: number }
}

function loadPrefs(): PiPPrefs {
  if (typeof window === "undefined") {
    return { enabled: false, minimized: false, position: { x: -1, y: -1 } }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PiPPrefs
  } catch {}
  return { enabled: false, minimized: false, position: { x: -1, y: -1 } }
}

function savePrefs(prefs: PiPPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

// ─── Audio Level Meter ──────────────────────────────────────────────────────

function useAudioLevel(isActive: boolean) {
  const [level, setLevel] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      audioCtxRef.current = null
      streamRef.current = null
      setLevel(0)
      return
    }

    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream

        const ctx = new AudioContext()
        audioCtxRef.current = ctx
        const source = ctx.createMediaStreamSource(stream)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 256
        analyser.smoothingTimeConstant = 0.5
        source.connect(analyser)

        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (cancelled) return
          analyser.getByteFrequencyData(data)
          let sum = 0
          const count = Math.min(32, data.length)
          for (let i = 0; i < count; i++) sum += data[i]
          setLevel(sum / count / 255)
          animRef.current = requestAnimationFrame(tick)
        }
        animRef.current = requestAnimationFrame(tick)
      } catch {
        // Mic denied
      }
    }

    start()

    return () => {
      cancelled = true
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [isActive])

  return level
}

function AudioLevelBar({ level }: { level: number }) {
  const bars = 5
  const filledBars = Math.round(level * bars * 3)

  return (
    <div className="flex items-center gap-1">
      <Mic className="h-2.5 w-2.5 text-white/40" />
      <div className="flex items-end gap-px">
        {Array.from({ length: bars }).map((_, i) => {
          const active = i < Math.min(filledBars, bars)
          const color = i < 3 ? "bg-emerald-400" : i < 4 ? "bg-yellow-400" : "bg-red-400"
          return (
            <div
              key={i}
              className={cn(
                "w-1 rounded-full transition-all duration-75",
                active ? color : "bg-white/15"
              )}
              style={{ height: `${6 + i * 2}px` }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────

interface WebcamPiPProps {
  showToggleButton?: boolean
  className?: string
}

/** Imperative handle for parent to access webcam streams */
export interface WebcamPiPHandle {
  getStream(): MediaStream | null
  getCanvas(): HTMLCanvasElement | null
  enable(): void
}

/**
 * WebcamPiP — a small draggable webcam preview window.
 *
 * - Video-only (NO audio — phone handles that)
 * - Draggable, defaulting to bottom-right corner
 * - Can be minimized to icon only
 * - Audio level meter shows mic is picking up voice
 * - Preferences persisted in localStorage
 */
export const WebcamPiP = forwardRef<WebcamPiPHandle, WebcamPiPProps>(function WebcamPiP({ showToggleButton = true, className }, ref) {
  const [prefs, setPrefs] = useState<PiPPrefs>(() => loadPrefs())
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: -1, y: -1 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pipRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  // Audio level meter — active when webcam is showing
  const audioLevel = useAudioLevel(prefs.enabled && !prefs.minimized)

  // Sync position from prefs on mount
  useEffect(() => {
    if (prefs.position.x >= 0 && prefs.position.y >= 0) {
      setPosition(prefs.position)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const startCamera = useCallback(async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: "user" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setHasPermission(true)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Camera unavailable"
      setError(msg)
      setHasPermission(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  // Start/stop camera when enabled changes
  useEffect(() => {
    if (prefs.enabled && !prefs.minimized) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      if (!prefs.enabled) stopCamera()
    }
  }, [prefs.enabled, prefs.minimized, startCamera, stopCamera])

  const updatePrefs = useCallback((updates: Partial<PiPPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...updates }
      savePrefs(next)
      return next
    })
  }, [])

  // Expose stream + canvas to parent via ref
  // Note: getCanvas returns null — blur processing removed for performance.
  // The session recorder uses the raw video stream directly.
  useImperativeHandle(ref, () => ({
    getStream: () => streamRef.current,
    getCanvas: () => null,
    enable: () => {
      if (!prefs.enabled) {
        updatePrefs({ enabled: true, minimized: false })
      } else if (prefs.minimized) {
        updatePrefs({ minimized: false })
      }
    },
  }), [prefs.enabled, prefs.minimized, updatePrefs])

  const toggleEnabled = useCallback(() => {
    updatePrefs({ enabled: !prefs.enabled })
  }, [prefs.enabled, updatePrefs])

  const toggleMinimized = useCallback(() => {
    updatePrefs({ minimized: !prefs.minimized })
  }, [prefs.minimized, updatePrefs])

  // ─── Dragging ─────────────────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!pipRef.current) return
      e.preventDefault()
      const rect = pipRef.current.getBoundingClientRect()
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      setIsDragging(true)
    },
    []
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y })
    }

    const handleMouseUp = (e: MouseEvent) => {
      const newPos = { x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y }
      setIsDragging(false)
      setPosition(newPos)
      updatePrefs({ position: newPos })
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, updatePrefs])

  // ─── Computed position style ──────────────────────────────────────────────

  const pipStyle: React.CSSProperties =
    position.x >= 0
      ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto" }
      : { position: "fixed", right: 20, bottom: 80 }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* External toggle button */}
      {showToggleButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEnabled}
          className={cn(
            "gap-1.5 text-xs",
            prefs.enabled ? "text-orange-400 hover:text-orange-300" : "text-muted-foreground",
            className
          )}
          title={prefs.enabled ? "Turn off webcam" : "Turn on webcam (self-view)"}
        >
          {prefs.enabled ? (
            <Video className="h-3.5 w-3.5" />
          ) : (
            <VideoOff className="h-3.5 w-3.5" />
          )}
          Webcam
        </Button>
      )}

      {/* PiP Window */}
      {prefs.enabled && (
        <div
          ref={pipRef}
          style={{ ...pipStyle, zIndex: 9999 }}
          className={cn(
            "rounded-xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden",
            "bg-zinc-900/90 backdrop-blur-sm",
            "transition-all duration-200",
            isDragging ? "cursor-grabbing scale-105 opacity-90" : "cursor-default",
            prefs.minimized ? "w-10 h-10 rounded-full" : "w-44"
          )}
        >
          {prefs.minimized ? (
            <button
              onClick={toggleMinimized}
              className="w-full h-full flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors"
              title="Expand webcam"
            >
              <Video className="h-5 w-5" />
            </button>
          ) : (
            <div className="flex flex-col">
              {/* Drag handle + controls */}
              <div
                className="flex items-center justify-between px-2 py-1 bg-black/40 cursor-grab active:cursor-grabbing"
                onMouseDown={handleMouseDown}
              >
                <div className="flex items-center gap-1 text-white/40">
                  <GripHorizontal className="h-3 w-3" />
                  <span className="text-xs font-medium text-white/60">You</span>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={toggleMinimized}
                    className="p-0.5 rounded text-white/40 hover:text-white/80 transition-colors"
                    title="Minimize"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={toggleEnabled}
                    className="p-0.5 rounded text-white/40 hover:text-red-400 transition-colors"
                    title="Close webcam"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <VideoOff className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Video feed */}
              <div className="relative aspect-[4/3] bg-zinc-800">
                {hasPermission === false || error ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2">
                    <VideoOff className="h-6 w-6 text-zinc-500" />
                    <p className="text-xs text-zinc-500 text-center leading-tight">
                      {error || "Camera denied"}
                    </p>
                  </div>
                ) : hasPermission === null ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                  </div>
                ) : null}

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "w-full h-full object-cover -scale-x-100",
                    hasPermission ? "opacity-100" : "opacity-0"
                  )}
                />

                {/* Audio level indicator */}
                {hasPermission && (
                  <div className="absolute bottom-1 right-1 rounded-sm bg-black/60 px-1.5 py-0.5">
                    <AudioLevelBar level={audioLevel} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
})
