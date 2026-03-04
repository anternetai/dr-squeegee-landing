"use client"

import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react"
import { Video, VideoOff, Minus, GripHorizontal, Sparkles, Mic } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const STORAGE_KEY = "webcam-pip-prefs"

type BgEffect = "none" | "light-blur" | "heavy-blur"

const BG_EFFECTS: { key: BgEffect; label: string; blur: number }[] = [
  { key: "none", label: "Off", blur: 0 },
  { key: "light-blur", label: "Light", blur: 8 },
  { key: "heavy-blur", label: "Heavy", blur: 20 },
]

interface PiPPrefs {
  enabled: boolean
  minimized: boolean
  position: { x: number; y: number }
  bgEffect?: BgEffect
}

function loadPrefs(): PiPPrefs {
  if (typeof window === "undefined") {
    return { enabled: false, minimized: false, position: { x: -1, y: -1 }, bgEffect: "none" }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PiPPrefs
      // Ensure bgEffect has a default
      if (!parsed.bgEffect) parsed.bgEffect = "none"
      return parsed
    }
  } catch {}
  return { enabled: false, minimized: false, position: { x: -1, y: -1 }, bgEffect: "none" }
}

function savePrefs(prefs: PiPPrefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {}
}

// ─── MediaPipe Segmenter Singleton ──────────────────────────────────────────
// We lazily load the segmenter only when a blur effect is first activated.
// This avoids downloading ~5MB of WASM + model on page load.

let segmenterPromise: Promise<any> | null = null
let segmenterInstance: any | null = null

async function getSegmenter(): Promise<any> {
  if (segmenterInstance) return segmenterInstance

  if (!segmenterPromise) {
    segmenterPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision")
      const { ImageSegmenter, FilesetResolver } = vision

      const wasmFileset = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.32/wasm"
      )

      const segmenter = await ImageSegmenter.createFromOptions(wasmFileset, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      })

      segmenterInstance = segmenter
      return segmenter
    })()
  }

  return segmenterPromise
}

// ─── Canvas Background Blur Processor ───────────────────────────────────────

function useBackgroundBlur(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  effect: BgEffect,
  isActive: boolean
) {
  const animFrameRef = useRef<number>(0)
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastTimestampRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive || effect === "none") {
      // Cancel any running loop
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Create offscreen canvas for blurred background
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement("canvas")
    }
    const offscreen = offscreenCanvasRef.current

    const blurAmount = BG_EFFECTS.find((e) => e.key === effect)?.blur ?? 10

    let segmenter: any = null
    let isRunning = true

    // Initialize segmenter
    getSegmenter().then((s) => {
      if (!isRunning) return
      segmenter = s
    })

    const processFrame = () => {
      if (!isRunning) return

      if (!video.videoWidth || !video.videoHeight || video.readyState < 2) {
        animFrameRef.current = requestAnimationFrame(processFrame)
        return
      }

      const w = video.videoWidth
      const h = video.videoHeight

      // Size canvases to match video
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        offscreen.width = w
        offscreen.height = h
      }

      if (!segmenter) {
        // Segmenter not ready yet — just draw raw video
        ctx.drawImage(video, 0, 0, w, h)
        animFrameRef.current = requestAnimationFrame(processFrame)
        return
      }

      // MediaPipe requires monotonically increasing timestamps
      const now = performance.now()
      if (now <= lastTimestampRef.current) {
        animFrameRef.current = requestAnimationFrame(processFrame)
        return
      }
      lastTimestampRef.current = now

      try {
        // Run segmentation
        const result = segmenter.segmentForVideo(video, now)
        const categoryMask = result?.categoryMask

        if (!categoryMask) {
          ctx.drawImage(video, 0, 0, w, h)
          animFrameRef.current = requestAnimationFrame(processFrame)
          return
        }

        const maskData = categoryMask.getAsUint8Array()

        // Step 1: Draw blurred background on offscreen canvas
        const offCtx = offscreen.getContext("2d")!
        offCtx.filter = `blur(${blurAmount}px)`
        offCtx.drawImage(video, 0, 0, w, h)
        offCtx.filter = "none"

        // Step 2: Draw the blurred background on main canvas
        ctx.drawImage(offscreen, 0, 0, w, h)

        // Step 3: Draw the original video frame
        // We need to extract only the person pixels using the mask
        // Draw original frame to offscreen temporarily
        offCtx.filter = "none"
        offCtx.drawImage(video, 0, 0, w, h)

        // Get pixel data from both
        const bgImageData = ctx.getImageData(0, 0, w, h)
        const fgImageData = offCtx.getImageData(0, 0, w, h)
        const outPixels = bgImageData.data

        // Composite: where mask > 0 (person), use original frame pixels
        for (let i = 0; i < maskData.length; i++) {
          if (maskData[i] > 0) {
            // Person pixel — use original (unblurred) frame
            const pi = i * 4
            outPixels[pi] = fgImageData.data[pi]         // R
            outPixels[pi + 1] = fgImageData.data[pi + 1] // G
            outPixels[pi + 2] = fgImageData.data[pi + 2] // B
            outPixels[pi + 3] = 255                        // A
          }
          // else: keep the blurred background pixel already in bgImageData
        }

        ctx.putImageData(bgImageData, 0, 0)

        // Close the mask to free memory
        categoryMask.close()
      } catch {
        // On error, just draw raw video
        ctx.drawImage(video, 0, 0, w, h)
      }

      animFrameRef.current = requestAnimationFrame(processFrame)
    }

    animFrameRef.current = requestAnimationFrame(processFrame)

    return () => {
      isRunning = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
    }
  }, [videoRef, canvasRef, effect, isActive])
}

// ─── Effect Picker ──────────────────────────────────────────────────────────

function EffectPicker({
  value,
  onChange,
}: {
  value: BgEffect
  onChange: (effect: BgEffect) => void
}) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setOpen(!open)}
        onMouseDown={(e) => e.stopPropagation()}
        className={cn(
          "p-0.5 rounded transition-colors",
          value !== "none"
            ? "text-orange-400 hover:text-orange-300"
            : "text-white/40 hover:text-white/80"
        )}
        title="Background effects"
      >
        <Sparkles className="h-3 w-3" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 bg-zinc-800/95 border border-white/10 rounded-lg shadow-xl p-1 min-w-[100px]"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="text-[9px] text-white/40 font-medium px-2 py-0.5 uppercase tracking-wider">
            Background
          </div>
          {BG_EFFECTS.map((fx) => (
            <button
              key={fx.key}
              onClick={() => {
                onChange(fx.key)
                setOpen(false)
              }}
              className={cn(
                "w-full text-left px-2 py-1 rounded text-xs transition-colors",
                value === fx.key
                  ? "bg-orange-500/20 text-orange-400"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              )}
            >
              {fx.label}
              {fx.key === "none" && (
                <span className="text-white/30 ml-1">— raw</span>
              )}
              {fx.key === "light-blur" && (
                <span className="text-white/30 ml-1">blur</span>
              )}
              {fx.key === "heavy-blur" && (
                <span className="text-white/30 ml-1">blur</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Audio Level Meter ──────────────────────────────────────────────────────

function useAudioLevel(isActive: boolean) {
  const [level, setLevel] = useState(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) {
      // Cleanup
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {})
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
      audioCtxRef.current = null
      analyserRef.current = null
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
        analyserRef.current = analyser

        const data = new Uint8Array(analyser.frequencyBinCount)

        function tick() {
          if (cancelled) return
          analyser.getByteFrequencyData(data)
          // Average of lower frequencies (voice range)
          let sum = 0
          const count = Math.min(32, data.length)
          for (let i = 0; i < count; i++) sum += data[i]
          const avg = sum / count / 255 // 0-1
          setLevel(avg)
          animRef.current = requestAnimationFrame(tick)
        }
        animRef.current = requestAnimationFrame(tick)
      } catch {
        // Mic denied — just show 0
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
  const filledBars = Math.round(level * bars * 3) // multiply to make it more sensitive

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
  /** Whether to show the toggle button (outside the PiP window) */
  showToggleButton?: boolean
  className?: string
}

/** Imperative handle for parent to access webcam streams */
export interface WebcamPiPHandle {
  getStream(): MediaStream | null
  getCanvas(): HTMLCanvasElement | null
  /** Programmatically enable the webcam (e.g., when starting session recording) */
  enable(): void
}

/**
 * WebcamPiP — a small draggable webcam preview window.
 *
 * - Video-only (NO audio — audio comes from phone call)
 * - Draggable, defaulting to bottom-right corner
 * - Can be minimized to icon only
 * - Background blur effects (none, light, heavy) via MediaPipe
 * - Preferences persisted in localStorage
 * - Purpose: self-awareness during calls (posture, smile, energy)
 */
export const WebcamPiP = forwardRef<WebcamPiPHandle, WebcamPiPProps>(function WebcamPiP({ showToggleButton = true, className }, ref) {
  const [prefs, setPrefs] = useState<PiPPrefs>(() => loadPrefs())
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [position, setPosition] = useState({ x: -1, y: -1 }) // -1 = use CSS default
  const [segmenterReady, setSegmenterReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const pipRef = useRef<HTMLDivElement>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const bgEffect = prefs.bgEffect ?? "none"
  const isBlurActive = bgEffect !== "none" && prefs.enabled && !prefs.minimized && hasPermission === true

  // Audio level meter — active when webcam is showing
  const audioLevel = useAudioLevel(prefs.enabled && !prefs.minimized)

  // Preload segmenter when blur is activated
  useEffect(() => {
    if (bgEffect !== "none" && !segmenterReady) {
      getSegmenter().then(() => setSegmenterReady(true)).catch(() => {})
    }
  }, [bgEffect, segmenterReady])

  // Run the background blur processing loop
  useBackgroundBlur(videoRef, canvasRef, bgEffect, isBlurActive)

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
        audio: false, // NO audio — phone handles that
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
  useImperativeHandle(ref, () => ({
    getStream: () => streamRef.current,
    getCanvas: () => canvasRef.current,
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

  const setEffect = useCallback(
    (effect: BgEffect) => {
      updatePrefs({ bgEffect: effect })
    },
    [updatePrefs]
  )

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
      const x = e.clientX - dragOffset.current.x
      const y = e.clientY - dragOffset.current.y
      setPosition({ x, y })
    }

    const handleMouseUp = (e: MouseEvent) => {
      const x = e.clientX - dragOffset.current.x
      const y = e.clientY - dragOffset.current.y
      setIsDragging(false)
      const newPos = { x, y }
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

  // ─── Close effect picker when clicking outside ────────────────────────────

  // Handled internally by the EffectPicker component

  // ─── Computed position style ──────────────────────────────────────────────

  const pipStyle: React.CSSProperties =
    position.x >= 0
      ? { position: "fixed", left: position.x, top: position.y, right: "auto", bottom: "auto" }
      : { position: "fixed", right: 20, bottom: 80 } // default: bottom-right

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
            /* Minimized: just a circle icon */
            <button
              onClick={toggleMinimized}
              className="w-full h-full flex items-center justify-center text-orange-400 hover:text-orange-300 transition-colors"
              title="Expand webcam"
            >
              <Video className="h-5 w-5" />
            </button>
          ) : (
            /* Expanded view */
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
                  <EffectPicker value={bgEffect} onChange={setEffect} />
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

                {/* Hidden video element — always needed as the camera source */}
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    "w-full h-full object-cover",
                    // Mirror so it looks natural (like a mirror)
                    "-scale-x-100",
                    // Show video when no blur effect, hide when blur is active
                    hasPermission && !isBlurActive ? "opacity-100" : "opacity-0",
                    // When blur is active, we still need the video in the DOM but hidden
                    isBlurActive ? "absolute inset-0 pointer-events-none" : ""
                  )}
                />

                {/* Canvas element — shown when blur effect is active */}
                {isBlurActive && (
                  <canvas
                    ref={canvasRef}
                    className={cn(
                      "w-full h-full object-cover",
                      // Mirror to match the video element
                      "-scale-x-100",
                      hasPermission ? "opacity-100" : "opacity-0"
                    )}
                  />
                )}

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
