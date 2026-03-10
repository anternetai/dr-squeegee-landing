"use client"

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  Suspense,
  lazy,
  type ComponentType,
  type ReactNode,
  type RefObject,
} from "react"
import useSWR from "swr"
import {
  Building2,
  User,
  Globe,
  ExternalLink,
  Hash,
  Phone,
  PhoneOff,
  PhoneCall,
  CalendarCheck,
  TrendingUp,
  Zap,
  ZapOff,
  Keyboard,
  Loader2,
  AlertCircle,
  RefreshCw,
  FileDown,
  MessageSquare,
  XCircle,
  Voicemail,
  SkipForward,
  ChevronRight,
  Sparkles,
  Clock,
  ChevronDown,
  ChevronUp,
  Circle,
  Square,
  CheckCircle,
  CheckCircle2,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { DialerLead, DialerOutcome, DialerQueueResponse } from "@/lib/dialer/types"
import type { AIAnalysisResult, RecordingState } from "@/lib/dialer/ai-types"
import type { CallState } from "@/lib/dialer/types"
import { LiveNotes } from "./live-notes"
import { KeyboardShortcuts } from "./keyboard-shortcuts"
import { AIAnalysisPanel } from "./ai-analysis-panel"
import { useMixedAudioRecording } from "@/lib/dialer/use-mixed-audio-recording"
import { useSessionRecording, type SessionRecordingState, type WebcamCorner, type WebcamSize } from "@/lib/dialer/use-session-recording"
import type { WebcamPiPHandle } from "./webcam-pip"

// ─── Safe lazy import helper ───────────────────────────────────────────────────

function makeLazyComponent<P extends object>(
  importer: () => Promise<Record<string, ComponentType<P>>>,
  exportKey: string,
  fallbackLabel: string
): ComponentType<P> {
  return lazy(async () => {
    try {
      const mod = await importer()
      const Comp = mod[exportKey]
      if (!Comp) throw new Error("missing export")
      return { default: Comp }
    } catch {
      const Placeholder = () => (
        <Card className="flex h-full min-h-[200px] items-center justify-center border-dashed border-muted-foreground/20">
          <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
            <AlertCircle className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{fallbackLabel}</p>
            <p className="text-[10px] text-muted-foreground/50">Loading…</p>
          </CardContent>
        </Card>
      )
      return { default: Placeholder as unknown as ComponentType<P> }
    }
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ScriptTeleprompter = makeLazyComponent<any>(() => import("./script-teleprompter") as any, "ScriptTeleprompter", "Script Teleprompter")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ObjectionHandler = makeLazyComponent<any>(() => import("./objection-handler") as any, "ObjectionHandler", "Objection Handler")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PowerDialer = makeLazyComponent<any>(() => import("./power-dialer") as any, "PowerDialer", "Power Dialer")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const WebcamPiP = makeLazyComponent<any>(() => import("./webcam-pip") as any, "WebcamPiP", "Webcam PiP")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CallTimerComp = makeLazyComponent<any>(() => import("./call-timer") as any, "CallTimer", "Call Timer")

// ─── Types & Config ────────────────────────────────────────────────────────────

type ColdCallOutcome =
  | "no_answer"
  | "voicemail"
  | "conversation"
  | "wrong_number"
  | "not_interested"
  | "demo_booked"

const OUTCOME_CONFIG: Record<
  ColdCallOutcome,
  { label: string; icon: typeof Phone; color: string; bgColor: string; shortcut: string }
> = {
  no_answer: {
    label: "No Answer",
    icon: PhoneOff,
    color: "text-muted-foreground",
    bgColor: "border-muted-foreground/20 hover:border-muted-foreground/50 hover:bg-muted",
    shortcut: "1",
  },
  voicemail: {
    label: "Voicemail",
    icon: Voicemail,
    color: "text-blue-500",
    bgColor: "border-blue-500/20 hover:border-blue-500/50 hover:bg-blue-500/10",
    shortcut: "2",
  },
  conversation: {
    label: "Answered",
    icon: MessageSquare,
    color: "text-emerald-500",
    bgColor: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10",
    shortcut: "3",
  },
  wrong_number: {
    label: "Wrong #",
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "border-red-400/20 hover:border-red-400/50 hover:bg-red-400/10",
    shortcut: "4",
  },
  not_interested: {
    label: "Not Interested",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10",
    shortcut: "5",
  },
  demo_booked: {
    label: "Booked Demo 🎉",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10 ring-2 ring-purple-500/20",
    shortcut: "6",
  },
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (phone.startsWith("+")) return phone
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  return `+${digits}`
}

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10)
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11 && digits.startsWith("1"))
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

function formatDuration(ms: number): string {
  const total = Math.floor(ms / 1000)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

async function fetchQueue(tzOverride?: string): Promise<DialerQueueResponse> {
  const params = new URLSearchParams({ limit: "500" })
  if (tzOverride) params.set("timezone", tzOverride)
  const res = await fetch(`/api/portal/dialer/queue?${params}`)
  if (!res.ok) throw new Error("Failed to fetch queue")
  return res.json()
}

// ─── Queue Position Persistence ─────────────────────────────────────────────────
// Saves/restores the current position per timezone so the queue doesn't reset
// to lead #1 on every page load or session start.

const POSITION_KEY = "dialer-queue-position"

function saveQueuePosition(timezone: string, index: number) {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "{}")
    saved[timezone] = { index, updatedAt: new Date().toISOString() }
    localStorage.setItem(POSITION_KEY, JSON.stringify(saved))
  } catch {}
}

function loadQueuePosition(timezone: string, maxIndex: number): number {
  try {
    const saved = JSON.parse(localStorage.getItem(POSITION_KEY) || "{}")
    const pos = saved[timezone]?.index
    if (typeof pos === "number" && pos > 0 && pos < maxIndex) {
      return pos
    }
  } catch {}
  return 0
}


// ─── Session Timer ─────────────────────────────────────────────────────────────

function useSessionTimer() {
  const [seconds, setSeconds] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startRef.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0
    ? `${h}h ${m.toString().padStart(2, "0")}m`
    : `${m}:${s.toString().padStart(2, "0")}`
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LeadInfoCard({ lead }: { lead: DialerLead }) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="flex items-center gap-2">
        <Building2 className="size-4 shrink-0 text-orange-500" />
        <span data-pii className="max-w-[200px] truncate font-semibold">
          {lead.business_name || "Unknown Business"}
        </span>
      </div>
      {(lead.owner_name || lead.first_name) && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <User className="size-3.5 shrink-0" />
          <span data-pii>{lead.owner_name || lead.first_name}</span>
        </div>
      )}
      <div className="flex items-center gap-1.5 text-sm">
        <Phone className="size-3.5 shrink-0 text-muted-foreground" />
        <span data-pii className="font-mono tabular-nums">{formatPhone(lead.phone_number)}</span>
      </div>
      {lead.website && (
        <a
          href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-blue-400 transition-colors hover:text-blue-300"
          data-pii
        >
          <Globe className="size-3.5" />
          <span className="max-w-[120px] truncate">
            {lead.website.replace(/^https?:\/\//, "")}
          </span>
          <ExternalLink className="size-3 shrink-0" />
        </a>
      )}
      <div className="flex items-center gap-1.5">
        {lead.state && <Badge data-pii variant="secondary" className="text-xs">{lead.state}</Badge>}
        {lead.timezone && (
          <Badge variant="outline" className="font-mono text-xs">{lead.timezone}</Badge>
        )}
        <Badge variant="outline" className="tabular-nums text-xs">
          <Hash className="mr-0.5 size-3" />
          {lead.attempt_count}/{lead.max_attempts}
        </Badge>
      </div>
    </div>
  )
}

function StatsBar({
  sessionDials,
  sessionDemos,
  timeToday,
}: {
  sessionDials: number
  sessionDemos: number
  timeToday: string
}) {
  const convRate = sessionDials > 0 ? ((sessionDemos / sessionDials) * 100).toFixed(1) : "0.0"
  return (
    <div className="flex shrink-0 items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <PhoneCall className="size-3.5 text-orange-400" />
        <span className="font-bold tabular-nums">{sessionDials}</span>
        <span className="text-xs text-muted-foreground">dials</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <CalendarCheck className="size-3.5 text-purple-400" />
        <span className="font-bold tabular-nums">{sessionDemos}</span>
        <span className="text-xs text-muted-foreground">demos</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <TrendingUp className="size-3.5 text-emerald-400" />
        <span className="font-bold tabular-nums">{convRate}%</span>
      </div>
      <Separator orientation="vertical" className="h-4" />
      <div className="flex items-center gap-1.5">
        <Clock className="size-3.5 text-blue-400" />
        <span className="font-mono text-xs tabular-nums">{timeToday}</span>
      </div>
    </div>
  )
}

function MobileSection({
  label,
  defaultOpen = false,
  children,
}: {
  label: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="overflow-hidden rounded-lg border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between bg-muted/30 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted/50"
      >
        {label}
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {open && <div className="p-3">{children}</div>}
    </div>
  )
}

// ─── Session Recording Button ──────────────────────────────────────────────────

function SessionRecButton({
  state,
  durationMs,
  onStart,
  onStop,
}: {
  state: SessionRecordingState
  durationMs: number
  onStart: () => void
  onStop: () => void
}) {
  if (state === "done") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 shrink-0">
        <CheckCircle className="size-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-emerald-400">Saved</span>
      </div>
    )
  }

  if (state === "uploading") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/5 px-2.5 py-1.5 shrink-0">
        <Loader2 className="size-3.5 text-orange-400 animate-spin" />
        <span className="text-xs text-orange-400">Uploading...</span>
      </div>
    )
  }

  if (state === "recording" || state === "stopping") {
    return (
      <button
        onClick={onStop}
        disabled={state === "stopping"}
        className="flex items-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 shrink-0 hover:bg-red-500/20 transition-colors"
      >
        <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-red-500" />
        <span className="text-xs font-medium text-red-400 tabular-nums">{formatDuration(durationMs)}</span>
        <Square className="size-3 text-red-400 fill-red-400" />
      </button>
    )
  }

  if (state === "waiting-screen") {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border border-orange-500/30 bg-orange-500/5 px-2.5 py-1.5 shrink-0">
        <Loader2 className="size-3.5 text-orange-400 animate-spin" />
        <span className="text-xs text-orange-400">Select screen...</span>
      </div>
    )
  }

  // Idle or error — show REC button
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStart}
      className="gap-1.5 shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
      title="Start session recording (screen + webcam + audio)"
    >
      <Circle className="size-3 fill-red-500 text-red-500" />
      <span className="text-xs font-bold">REC</span>
    </Button>
  )
}

// ─── Recording Preview (popup window) ─────────────────────────────────────────

const CORNER_LABELS: Record<WebcamCorner, string> = {
  "top-left": "TL",
  "top-right": "TR",
  "bottom-left": "BL",
  "bottom-right": "BR",
}

const SIZE_LABELS: Record<WebcamSize, string> = {
  small: "S",
  medium: "M",
  large: "L",
}

/**
 * Opens a separate browser window showing the live recording preview.
 * This keeps the preview OFF the recorded screen (no Inception effect).
 * The popup can be dragged to a second monitor.
 */
function useRecordingPreviewWindow(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isRecording: boolean,
  corner: WebcamCorner,
  onCornerChange: (c: WebcamCorner) => void,
  size: WebcamSize,
  onSizeChange: (s: WebcamSize) => void,
) {
  const popupRef = useRef<Window | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Store everything in refs so the popup button handlers always read latest
  const onCornerRef = useRef(onCornerChange)
  const onSizeRef = useRef(onSizeChange)
  const cornerRef = useRef(corner)
  const sizeRef = useRef(size)
  onCornerRef.current = onCornerChange
  onSizeRef.current = onSizeChange
  cornerRef.current = corner
  sizeRef.current = size

  // Only depend on isRecording — never re-run for corner/size changes
  useEffect(() => {
    if (!isRecording) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (popupRef.current && !popupRef.current.closed) popupRef.current.close()
      popupRef.current = null
      return
    }

    // Open near-fullscreen popup
    const w = Math.min(screen.availWidth, 1920)
    const h = Math.min(screen.availHeight, 1080)
    const popup = window.open(
      "",
      "recording-preview",
      `width=${w},height=${h},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    )
    if (!popup) return
    popupRef.current = popup

    popup.document.title = "Recording Preview"
    popup.document.body.style.cssText = "margin:0;padding:0;background:#111;font-family:system-ui,sans-serif;overflow:hidden;"
    popup.document.body.innerHTML = `
      <div style="display:flex;flex-direction:column;height:100vh;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#000;flex-shrink:0;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 2s infinite;"></span>
            <span style="font-size:12px;color:rgba(255,255,255,0.5);font-weight:500;">Recording Preview</span>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;color:rgba(255,255,255,0.25);">Size</span>
              <button data-size="small" class="sz-btn">S</button>
              <button data-size="medium" class="sz-btn">M</button>
              <button data-size="large" class="sz-btn">L</button>
            </div>
            <div style="width:1px;height:14px;background:rgba(255,255,255,0.1);"></div>
            <div style="display:flex;align-items:center;gap:4px;">
              <span style="font-size:10px;color:rgba(255,255,255,0.25);">Position</span>
              <button data-corner="top-left" class="pos-btn">TL</button>
              <button data-corner="top-right" class="pos-btn">TR</button>
              <button data-corner="bottom-left" class="pos-btn">BL</button>
              <button data-corner="bottom-right" class="pos-btn">BR</button>
            </div>
          </div>
        </div>
        <canvas id="preview" style="flex:1;width:100%;background:#000;display:block;object-fit:contain;"></canvas>
      </div>
      <style>
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .sz-btn,.pos-btn{padding:2px 6px;border-radius:4px;border:none;font-size:10px;font-weight:700;cursor:pointer;background:transparent;color:rgba(255,255,255,0.3);}
        .sz-btn:hover,.pos-btn:hover{color:rgba(255,255,255,0.7);}
      </style>
    `

    // Button click handlers — use refs, never trigger React re-render that would destroy popup
    popup.document.querySelectorAll<HTMLButtonElement>(".sz-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const s = btn.dataset.size as WebcamSize
        onSizeRef.current(s)
        popup.document.querySelectorAll<HTMLButtonElement>(".sz-btn").forEach((b) => {
          const isActive = b.dataset.size === s
          b.style.background = isActive ? "rgba(59,130,246,0.3)" : "transparent"
          b.style.color = isActive ? "rgb(96,165,250)" : "rgba(255,255,255,0.3)"
        })
      })
    })

    popup.document.querySelectorAll<HTMLButtonElement>(".pos-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const c = btn.dataset.corner as WebcamCorner
        onCornerRef.current(c)
        popup.document.querySelectorAll<HTMLButtonElement>(".pos-btn").forEach((b) => {
          const isActive = b.dataset.corner === c
          b.style.background = isActive ? "rgba(249,115,22,0.3)" : "transparent"
          b.style.color = isActive ? "rgb(251,146,60)" : "rgba(255,255,255,0.3)"
        })
      })
    })

    // Set initial active button highlights
    const initSz = popup.document.querySelector<HTMLButtonElement>(`.sz-btn[data-size="${sizeRef.current}"]`)
    if (initSz) { initSz.style.background = "rgba(59,130,246,0.3)"; initSz.style.color = "rgb(96,165,250)" }
    const initPos = popup.document.querySelector<HTMLButtonElement>(`.pos-btn[data-corner="${cornerRef.current}"]`)
    if (initPos) { initPos.style.background = "rgba(249,115,22,0.3)"; initPos.style.color = "rgb(251,146,60)" }

    // Draw loop — mirror compositing canvas at 5fps
    const previewCanvas = popup.document.getElementById("preview") as HTMLCanvasElement | null
    intervalRef.current = setInterval(() => {
      if (popup.closed) {
        if (intervalRef.current) clearInterval(intervalRef.current)
        return
      }
      const src = canvasRef.current
      if (!src || !previewCanvas || src.width === 0) return
      const ctx = previewCanvas.getContext("2d")
      if (!ctx) return
      const cw = previewCanvas.clientWidth
      const aspect = src.width / (src.height || 1)
      const ch = Math.round(cw / aspect)
      if (previewCanvas.width !== cw) previewCanvas.width = cw
      if (previewCanvas.height !== ch) previewCanvas.height = ch
      ctx.drawImage(src, 0, 0, cw, ch)
    }, 200)

    return () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (popup && !popup.closed) popup.close()
      popupRef.current = null
    }
  }, [isRecording, canvasRef]) // only isRecording controls open/close — NOT corner/size
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CallCockpit() {
  const [timezoneOverride, setTimezoneOverride] = useState<string | null>(null)

  const {
    data: queue,
    isLoading,
    mutate,
  } = useSWR(
    timezoneOverride ? `cold-call-queue-cockpit-${timezoneOverride}` : "cold-call-queue-cockpit",
    () => fetchQueue(timezoneOverride || undefined),
    {
      revalidateOnFocus: true,
      refreshInterval: 120000,
    },
  )

  const [currentIndex, setCurrentIndex] = useState(0)
  const [positionRestored, setPositionRestored] = useState(false)
  const [trackedTimezone, setTrackedTimezone] = useState<string | null>(null)
  const [notes, setNotes] = useState("")
  const [liveNotes, setLiveNotes] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<ColdCallOutcome | null>(null)
  const [showNoteField, setShowNoteField] = useState(false)
  const [showDemoDatePicker, setShowDemoDatePicker] = useState(false)
  const [sessionDials, setSessionDials] = useState(0)
  const [sessionDemos, setSessionDemos] = useState(0)
  const [powerMode, setPowerMode] = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [autoDialActive, setAutoDialActive] = useState(false)
  const [aiSuggestedOutcome, setAiSuggestedOutcome] = useState<ColdCallOutcome | null>(null)

  // AI state
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)
  const [pendingLead, setPendingLead] = useState<DialerLead | null>(null)

  const notesRef = useRef<HTMLTextAreaElement>(null)
  // Track current call state so disposition logic knows if a call is active
  const currentCallStateRef = useRef<CallState>("idle")
  // Expose PowerDialer's hangUp so we can end calls when logging disposition
  const hangUpRef = useRef<(() => void) | null>(null)
  const sessionTime = useSessionTimer()

  // Remote audio stream ref — set by PowerDialer's onRemoteStream callback
  const remoteStreamRef = useRef<MediaStream | null>(null)
  // Local audio stream ref — set by PowerDialer's onLocalStream callback
  // Shares Telnyx's mic stream so mixed recording doesn't open a competing one
  const localStreamRef = useRef<MediaStream | null>(null)

  // Mixed audio recording (both sides of the call)
  const { recordingState, durationMs, startRecording, stopRecording, reset: resetRecording, mixedStreamRef } =
    useMixedAudioRecording({ remoteStreamRef, localStreamRef })
  const isRecording = recordingState === "recording"

  // Webcam ref for session recording
  const webcamRef = useRef<WebcamPiPHandle>(null)
  const webcamStreamForSessionRef = useRef<MediaStream | null>(null)
  const webcamCanvasForSessionRef = useRef<HTMLCanvasElement | null>(null)

  // Session video recording
  const {
    state: sessionRecState,
    durationMs: sessionRecDurationMs,
    error: sessionRecError,
    startRecording: startSessionRec,
    stopRecording: stopSessionRec,
    previewCanvasRef: sessionPreviewCanvasRef,
    webcamCorner: sessionWebcamCorner,
    setWebcamCorner: setSessionWebcamCorner,
    webcamSize: sessionWebcamSize,
    setWebcamSize: setSessionWebcamSize,
  } = useSessionRecording({
    webcamStreamRef: webcamStreamForSessionRef,
    webcamCanvasRef: webcamCanvasForSessionRef,
    mixedAudioStreamRef: mixedStreamRef,
  })

  // Recording preview in a separate popup window (so it doesn't appear in the recording)
  useRecordingPreviewWindow(
    sessionPreviewCanvasRef,
    sessionRecState === "recording",
    sessionWebcamCorner,
    setSessionWebcamCorner,
    sessionWebcamSize,
    setSessionWebcamSize,
  )

  // Recording blob from last call (for AI analysis)
  const lastCallBlobRef = useRef<Blob | null>(null)
  // Snapshot of the lead being called — so auto-submit uses correct lead even after advancing
  const callLeadRef = useRef<DialerLead | null>(null)
  // After disposition, save the next lead's ID so we can re-anchor when SWR refreshes
  const targetLeadIdRef = useRef<string | null>(null)

  const leads = queue?.leads || []
  const currentLead = leads[currentIndex] ?? null
  const totalInQueue = queue?.totalToday || 0

  const resetForm = useCallback(() => {
    setNotes("")
    setDemoDate("")
    setShowNoteField(false)
    setShowDemoDatePicker(false)
    setSelectedOutcome(null)
    setAiSuggestedOutcome(null)
  }, [])

  const submitDisposition = useCallback(
    async (lead: DialerLead, outcome: ColdCallOutcome, notesText: string, demoDateStr: string) => {
      await fetch("/api/portal/dialer/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          outcome: outcome as DialerOutcome,
          notes: notesText || undefined,
          demoDate: demoDateStr || undefined,
          callerNumberId: queue?.selectedNumber?.id || undefined,
        }),
      })
    },
    [queue?.selectedNumber?.id]
  )

  // Sync recording with call lifecycle
  const handleCallStateChange = useCallback(
    async (state: CallState) => {
      currentCallStateRef.current = state
      if (state === "connecting") {
        // Start recording when we begin dialing
        lastCallBlobRef.current = null
        setAiSuggestedOutcome(null)
        setSelectedOutcome(null)
        callLeadRef.current = currentLead
        startRecording()
      } else if (state === "disconnected") {
        // Stop recording when call ends — capture blob for AI
        const blob = await stopRecording()
        lastCallBlobRef.current = blob
        resetRecording()

        // Suggest disposition based on call duration — but NEVER auto-submit.
        // Always let the user choose so they can leave a voicemail, add notes, etc.
        const callSeconds = Math.floor(durationMs / 1000)
        let suggested: ColdCallOutcome
        if (callSeconds < 15) {
          suggested = "no_answer"
        } else if (callSeconds < 45) {
          suggested = "voicemail"
        } else {
          suggested = "conversation"
        }

        // Show suggestion, let user decide (disposition buttons highlight the suggestion)
        setAiSuggestedOutcome(suggested)
        setSelectedOutcome(suggested)
        if (suggested === "conversation") {
          setShowNoteField(true)
          setTimeout(() => notesRef.current?.focus(), 100)
        }
      }
    },
    [startRecording, stopRecording, durationMs, currentLead, resetRecording]
  )

  // Re-anchor index when leads array changes (e.g. after SWR re-fetch removes
  // a dispositioned lead, or reorders leads). Without this, the index drifts
  // and the displayed lead jumps — even mid-call.
  useEffect(() => {
    if (leads.length === 0) return

    // Priority 1: During an active call, anchor to the lead we're calling
    const activeLeadId = callLeadRef.current?.id
    if (activeLeadId) {
      const idx = leads.findIndex((l) => l.id === activeLeadId)
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx)
      }
      return // Don't process other anchoring during a call
    }

    // Priority 2: After disposition, anchor to the intended next lead
    if (targetLeadIdRef.current) {
      const targetIdx = leads.findIndex((l) => l.id === targetLeadIdRef.current)
      if (targetIdx >= 0 && targetIdx !== currentIndex) {
        setCurrentIndex(targetIdx)
      }
      targetLeadIdRef.current = null
      return
    }

    // Priority 3: Keep showing the same lead if possible (array shifted under us)
    const currentLeadId = currentLead?.id
    if (currentLeadId) {
      const idx = leads.findIndex((l) => l.id === currentLeadId)
      if (idx >= 0 && idx !== currentIndex) {
        setCurrentIndex(idx)
      } else if (idx < 0 && currentIndex >= leads.length) {
        setCurrentIndex(0)
      }
    } else if (currentIndex >= leads.length) {
      setCurrentIndex(0)
    }
  }, [leads, currentIndex, currentLead?.id])

  // Restore queue position from localStorage on first load
  useEffect(() => {
    if (!positionRestored && queue?.currentTimezone && leads.length > 0) {
      const saved = loadQueuePosition(queue.currentTimezone, leads.length)
      if (saved > 0) setCurrentIndex(saved)
      setTrackedTimezone(queue.currentTimezone)
      setPositionRestored(true)
    }
  }, [positionRestored, queue?.currentTimezone, leads.length])

  // Handle timezone transitions (save old position, load new one)
  useEffect(() => {
    if (queue?.currentTimezone && trackedTimezone && queue.currentTimezone !== trackedTimezone) {
      saveQueuePosition(trackedTimezone, currentIndex)
      const saved = loadQueuePosition(queue.currentTimezone, leads.length)
      setCurrentIndex(saved)
      setTrackedTimezone(queue.currentTimezone)
    }
  }, [queue?.currentTimezone, trackedTimezone, currentIndex, leads.length])

  // Persist position whenever it changes
  useEffect(() => {
    if (queue?.currentTimezone && positionRestored) {
      saveQueuePosition(queue.currentTimezone, currentIndex)
    }
  }, [currentIndex, queue?.currentTimezone, positionRestored])

  // Global keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inText =
        e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement
      if (e.key === "?" && !inText) {
        e.preventDefault()
        setShowShortcuts((v) => !v)
        return
      }
      if (e.key === "p" && !inText && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        setPowerMode((v) => !v)
        return
      }
      if (e.key === "Escape") {
        setAutoDialActive(false)
        return
      }
      if ((e.ctrlKey || e.metaKey) && !inText) {
        const idx = parseInt(e.key) - 1
        const outcomes = Object.keys(OUTCOME_CONFIG) as ColdCallOutcome[]
        if (idx >= 0 && idx < outcomes.length) {
          e.preventDefault()
          handleDisposition(outcomes[idx])
        }
      }
      if (!e.ctrlKey && !e.metaKey && !e.altKey && !inText) {
        const idx = parseInt(e.key) - 1
        const outcomes = Object.keys(OUTCOME_CONFIG) as ColdCallOutcome[]
        if (idx >= 0 && idx < outcomes.length) {
          e.preventDefault()
          handleDisposition(outcomes[idx])
        }
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [currentLead, saving, showNoteField, selectedOutcome, notes, demoDate, isRecording]) // eslint-disable-line react-hooks/exhaustive-deps

  const uploadAndAnalyze = useCallback(
    async (lead: DialerLead, blob: Blob, outcome: ColdCallOutcome) => {
      setAiResult({ panelState: "loading" })
      // Don't open panel yet — only show toast when results are ready
      try {
        // Upload audio blob to /api/portal/calls/transcribe — runs Whisper + AI analysis
        const formData = new FormData()
        const ext = blob.type.includes("ogg") ? "ogg" : "webm"
        formData.append("audio", blob, `call_${Date.now()}.${ext}`)
        formData.append("lead_id", lead.id)
        formData.append("duration_seconds", String(Math.floor(durationMs / 1000)))
        formData.append("user_disposition", outcome)

        const res = await fetch("/api/portal/calls/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) throw new Error("Transcription failed")
        const data = await res.json()

        const analysis = data.analysis
        const aiDisposition = analysis?.disposition || (outcome as DialerOutcome)

        // Quick outcomes that don't need user review when AI agrees
        const quickOutcomes: string[] = ["no_answer", "voicemail", "wrong_number", "not_interested"]
        const userAlreadyLogged = outcome as string
        const aiAgrees = aiDisposition === userAlreadyLogged

        if (aiAgrees && quickOutcomes.includes(userAlreadyLogged)) {
          // AI matches what user already logged — auto-accept, no interaction needed.
          // The disposition is already saved from handleDisposition().
          // The recording + analysis are already saved by the transcribe endpoint.
          setAiResult({
            panelState: "accepted",
            suggestedDisposition: aiDisposition,
            suggestedNotes: analysis?.autoNotes,
            suggestedFollowUpDate: analysis?.nextCallAt,
            summary: analysis?.summary || data.rawTranscript || "Transcription complete.",
            keyPoints: analysis?.keyPoints || [],
            objections: analysis?.objections || [],
            nextSteps: analysis?.nextSteps || [],
            grades: analysis?.coaching?.grades,
            coachingTips: analysis?.coaching?.tips,
            rawTranscript: data.rawTranscript,
          })
          setPendingLead(null)
          // Brief flash of "accepted" then auto-close
          setAiPanelOpen(true)
          setTimeout(() => setAiPanelOpen(false), 1500)
        } else {
          // AI disagrees or it's a meaningful outcome — show toast for review
          setAiPanelOpen(true)
          setAiResult({
            panelState: "ready",
            suggestedDisposition: aiDisposition,
            suggestedNotes: analysis?.autoNotes,
            suggestedFollowUpDate: analysis?.nextCallAt,
            summary: analysis?.summary || data.rawTranscript || "Transcription complete.",
            keyPoints: analysis?.keyPoints || [],
            objections: analysis?.objections || [],
            nextSteps: analysis?.nextSteps || [],
            grades: analysis?.coaching?.grades,
            coachingTips: analysis?.coaching?.tips,
            rawTranscript: data.rawTranscript,
          })
        }
      } catch {
        setAiResult({
          panelState: "ready",
          suggestedDisposition: outcome as DialerOutcome,
          summary: "AI analysis unavailable.",
        })
      }
    },
    [durationMs]
  )

  const handleDisposition = useCallback(
    async (outcome: ColdCallOutcome) => {
      // Use callLeadRef (the lead we actually called) — currentLead may have
      // shifted if the queue re-fetched or index changed between call end and
      // the user clicking a disposition button.
      const leadSnap = callLeadRef.current || currentLead
      if (!leadSnap || saving) return

      if (outcome === "conversation" && !showNoteField) {
        setShowNoteField(true)
        setSelectedOutcome(outcome)
        setTimeout(() => notesRef.current?.focus(), 100)
        return
      }
      if (outcome === "demo_booked" && !showDemoDatePicker) {
        setShowDemoDatePicker(true)
        setShowNoteField(true)
        setSelectedOutcome(outcome)
        return
      }

      setSaving(true)
      try {
        const notesSnap = liveNotes || notes
        const demoDateSnap = demoDate

        // CRITICAL: If a call is still active (e.g. voicemail playing), hang up FIRST.
        // Without this, voicemail audio keeps playing after logging disposition.
        const cs = currentCallStateRef.current
        if (cs === "connecting" || cs === "ringing" || cs === "connected") {
          hangUpRef.current?.()
        }

        // Stop any live recording and grab the blob
        let blob: Blob | null = lastCallBlobRef.current
        lastCallBlobRef.current = null
        if (isRecording) {
          blob = await stopRecording()
        }

        setSessionDials((c) => c + 1)
        if (outcome === "demo_booked") setSessionDemos((c) => c + 1)

        // CRITICAL: Submit disposition FIRST, before advancing.
        // This ensures the outcome is logged against the correct lead.
        await submitDisposition(leadSnap, outcome, notesSnap, demoDateSnap)

        resetForm()
        resetRecording()
        callLeadRef.current = null

        // NOW advance to next lead (after disposition is saved).
        // Save the target lead's ID so we can re-anchor after SWR refreshes.
        let nextLeadId: string | null = null
        if (currentIndex < leads.length - 1) {
          nextLeadId = leads[currentIndex + 1]?.id || null
          setCurrentIndex((i) => i + 1)
        } else {
          setCurrentIndex(0)
          nextLeadId = leads[0]?.id || null
        }
        // Store the target so the leads-change effect can re-anchor
        targetLeadIdRef.current = nextLeadId

        // Re-fetch queue in background so phone number rotation picks next number
        // and the dispositioned lead is removed from the array
        mutate()

        // Run AI analysis in background if we have a recording (non-blocking)
        if (blob && blob.size > 0) {
          setPendingLead(leadSnap)
          uploadAndAnalyze(leadSnap, blob, outcome).catch(console.error)
        }
      } catch (err) {
        console.error("Disposition error:", err)
      } finally {
        setSaving(false)
      }
    },
    [
      currentLead,
      saving,
      showNoteField,
      showDemoDatePicker,
      notes,
      liveNotes,
      demoDate,
      isRecording,
      currentIndex,
      leads.length,
      mutate,
      resetForm,
      resetRecording,
      stopRecording,
      uploadAndAnalyze,
      submitDisposition,
    ]
  )

  const confirmOutcome = useCallback(() => {
    if (selectedOutcome) handleDisposition(selectedOutcome)
  }, [selectedOutcome, handleDisposition])

  const skipLead = useCallback(() => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex((i) => i + 1)
      resetForm()
    }
  }, [currentIndex, leads.length, resetForm])

  // Quick skip: log as no_answer and auto-dial next lead
  const skipAndDialNext = useCallback(async () => {
    if (!currentLead) return
    const lead = currentLead

    // Submit no_answer disposition in background
    submitDisposition(lead, "no_answer", "", "").catch((err) =>
      console.error("Skip disposition error:", err)
    )

    setSessionDials((c) => c + 1)
    resetForm()

    // Advance to next lead and set re-anchor target
    let nextLeadId: string | null = null
    if (currentIndex < leads.length - 1) {
      nextLeadId = leads[currentIndex + 1]?.id || null
      setCurrentIndex((i) => i + 1)
    } else {
      setCurrentIndex(0)
      nextLeadId = leads[0]?.id || null
    }
    targetLeadIdRef.current = nextLeadId
    mutate()

    // Auto-dial disabled — user clicks Dial manually
  }, [currentLead, currentIndex, leads, mutate, resetForm, submitDisposition])

  const handleSync = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch("/api/portal/cold-calls/sync", { method: "POST" })
      await mutate()
    } catch {}
    finally { setSyncing(false) }
  }, [mutate])

  // Remote stream callback from PowerDialer
  const handleRemoteStream = useCallback((stream: MediaStream | null) => {
    remoteStreamRef.current = stream
  }, [])

  // Local stream callback from PowerDialer — shares Telnyx's mic with recording
  const handleLocalStream = useCallback((stream: MediaStream | null) => {
    localStreamRef.current = stream
  }, [])

  // Start session recording — auto-enable webcam, then refresh refs
  const handleStartSessionRecording = useCallback(async () => {
    if (webcamRef.current) {
      // Auto-enable webcam if not already on
      webcamRef.current.enable()
      // Wait for camera to start — retry up to 2s
      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 250))
        const stream = webcamRef.current.getStream()
        if (stream && stream.active) {
          webcamStreamForSessionRef.current = stream
          webcamCanvasForSessionRef.current = webcamRef.current.getCanvas()
          break
        }
      }
    }
    await startSessionRec()
  }, [startSessionRec])

  const handleAIAcceptAll = useCallback(
    async (data: { disposition: DialerOutcome; notes: string; followUpDate?: string }) => {
      if (!pendingLead) return
      await submitDisposition(pendingLead, data.disposition as ColdCallOutcome, data.notes, data.followUpDate || "")
      setAiResult((prev) => (prev ? { ...prev, panelState: "accepted" } : null))
      setPendingLead(null)
    },
    [pendingLead, submitDisposition]
  )

  const handleAIOverride = useCallback(
    async (data: { disposition: DialerOutcome; notes: string; followUpDate?: string }) => {
      if (!pendingLead) return
      await submitDisposition(pendingLead, data.disposition as ColdCallOutcome, data.notes, data.followUpDate || "")
      setAiResult((prev) => (prev ? { ...prev, panelState: "overridden" } : null))
      setPendingLead(null)
    },
    [pendingLead, submitDisposition]
  )

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // ─── Desktop layout ──────────────────────────────────────────────────────────

  const headerBar = (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
      {/* Lead Info */}
      {currentLead ? (
        <LeadInfoCard lead={currentLead} />
      ) : (
        <span className="text-sm text-muted-foreground">No lead selected</span>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Call Timer */}
      <Suspense fallback={<div className="w-20 h-8 animate-pulse rounded bg-muted" />}>
        <CallTimerComp duration={0} callState="idle" className="shrink-0" />
      </Suspense>

      {/* Webcam PiP */}
      <Suspense fallback={null}>
        <WebcamPiP ref={webcamRef} showToggleButton className="shrink-0" />
      </Suspense>

      {/* Session REC button */}
      <SessionRecButton
        state={sessionRecState}
        durationMs={sessionRecDurationMs}
        onStart={handleStartSessionRecording}
        onStop={stopSessionRec}
      />

      {/* Stats */}
      <StatsBar sessionDials={sessionDials} sessionDemos={sessionDemos} timeToday={sessionTime} />

      {/* Outbound number + pool health */}
      {queue?.selectedNumber && (
        <div className="flex items-center gap-1.5 shrink-0" title={`Calling from ${queue.selectedNumber.phone_number} (${queue.selectedNumber.calls_this_hour}/${queue.selectedNumber.max_calls_per_hour} this hour)\n${queue.phonePoolHealth?.active || 0} active, ${queue.phonePoolHealth?.cooling || 0} cooling, ${queue.phonePoolHealth?.retired || 0} retired`}>
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] font-mono text-muted-foreground">
            {queue.selectedNumber.phone_number.replace(/^\+1(\d{3})(\d{3})(\d{4})$/, "($1) $2-$3")}
          </span>
          <span className={cn(
            "text-[9px] font-bold px-1 py-0.5 rounded",
            (queue.phonePoolHealth?.warnings?.length || 0) > 0
              ? "bg-amber-500/20 text-amber-400"
              : "bg-green-500/20 text-green-400"
          )}>
            {queue.phonePoolHealth?.active || 0}/{(queue.phonePoolHealth?.active || 0) + (queue.phonePoolHealth?.cooling || 0) + (queue.phonePoolHealth?.retired || 0)}
          </span>
        </div>
      )}
      {queue?.phonePoolHealth?.warnings && queue.phonePoolHealth.warnings.length > 0 && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[10px] text-amber-400 font-medium" title={queue.phonePoolHealth.warnings.join("\n")}>
            {queue.phonePoolHealth.warnings.length === 1 ? queue.phonePoolHealth.warnings[0] : `${queue.phonePoolHealth.warnings.length} warnings`}
          </span>
        </div>
      )}
      {queue?.selectedNumber && (
        <button
          onClick={async () => {
            if (!confirm(`Flag ${queue.selectedNumber!.phone_number} as spam? (Retires at 3 reports)`)) return
            await fetch("/api/portal/dialer/report-spam", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ phoneNumberId: queue.selectedNumber!.id }),
            })
            mutate()
          }}
          className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors shrink-0"
          title="Flag current outbound number as spam — rotates to next number"
        >
          Flag Spam
        </button>
      )}

      {/* Timezone picker — switch queue to any timezone */}
      <div className="flex items-center gap-1 shrink-0">
        {(["ET", "CT", "MT", "PT"] as const).map((tz) => (
          <button
            key={tz}
            onClick={() => {
              const next = timezoneOverride === tz ? null : tz
              setTimezoneOverride(next)
              setCurrentIndex(0)
            }}
            className={cn(
              "px-2 py-1 rounded text-[11px] font-mono font-bold transition-colors",
              (timezoneOverride === tz || (!timezoneOverride && queue?.currentTimezone === tz))
                ? "bg-orange-500 text-white"
                : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
            )}
            title={timezoneOverride === tz ? `Click to return to auto schedule` : `Switch queue to ${tz} leads`}
          >
            {tz}
          </button>
        ))}
        {timezoneOverride && (
          <button
            onClick={() => { setTimezoneOverride(null); setCurrentIndex(0) }}
            className="px-1.5 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
            title="Return to auto schedule"
          >
            Auto
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Power mode toggle */}
        <Button
          variant={powerMode ? "default" : "outline"}
          size="sm"
          onClick={() => setPowerMode((v) => !v)}
          title="Toggle Power Mode (P)"
          className={cn("gap-1.5", powerMode && "bg-orange-500 hover:bg-orange-600 text-white")}
        >
          {powerMode ? <ZapOff className="size-3.5" /> : <Zap className="size-3.5" />}
          <span className="hidden sm:inline">{powerMode ? "Exit Power" : "Power"}</span>
        </Button>

        {/* Sync */}
        <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1.5">
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
          <span className="hidden sm:inline">Sync</span>
        </Button>

        {/* Shortcuts */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShortcuts(true)}
          title="Keyboard shortcuts (?)"
          className="gap-1.5"
        >
          <Keyboard className="size-3.5" />
          <span className="hidden sm:inline">?</span>
        </Button>
      </div>
    </div>
  )

  if (!currentLead) {
    return (
      <>
        <div className="space-y-4">
          {headerBar}
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-card px-8 py-20 text-center">
            <Phone className="mb-4 size-14 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold">No leads in queue</h3>
            <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">
              {totalInQueue === 0
                ? "Sync leads from Google Sheets to get started."
                : "All leads for this time block have been called. Nice work! 🎉"}
            </p>
            {totalInQueue === 0 && (
              <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="mt-5 gap-2">
                {syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                Sync from Google Sheet
              </Button>
            )}
          </div>
        </div>
        <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      </>
    )
  }

  // ─── Disposition panel (reusable block) ───────────────────────────────────────

  const dispositionBlock = (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span>Log outcome <span className="opacity-50">1–6</span></span>
        {isRecording && (
          <span className="inline-flex items-center gap-1 text-orange-400">
            <Sparkles className="size-2.5" /> AI analyzes
          </span>
        )}
        {!isRecording && aiSuggestedOutcome && (
          <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-400 ring-1 ring-orange-500/20">
            <Sparkles className="size-2.5" />
            AI suggested: {OUTCOME_CONFIG[aiSuggestedOutcome].label}
          </span>
        )}
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
        {(Object.entries(OUTCOME_CONFIG) as [ColdCallOutcome, (typeof OUTCOME_CONFIG)[ColdCallOutcome]][]).map(
          ([key, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={key}
                variant="outline"
                size="sm"
                className={cn(
                  "h-auto flex-col gap-0.5 py-2",
                  config.bgColor,
                  selectedOutcome === key &&
                    "ring-2 ring-orange-500 ring-offset-1 ring-offset-background"
                )}
                disabled={saving}
                onClick={() => handleDisposition(key)}
              >
                <Icon className={cn("size-4", config.color)} />
                <span className="hidden text-[10px] font-medium leading-tight sm:block">
                  {config.label}
                </span>
                <span className="text-[9px] text-muted-foreground">{config.shortcut}</span>
              </Button>
            )
          }
        )}
      </div>

      {showNoteField && (
        <div data-pii className="space-y-2 rounded-lg border bg-muted/20 p-2.5">
          <Textarea
            ref={notesRef}
            placeholder="Add notes about this call..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          {showDemoDatePicker && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-muted-foreground">Demo date:</label>
              <Input
                type="datetime-local"
                value={demoDate}
                onChange={(e) => setDemoDate(e.target.value)}
                className="h-8 w-auto text-sm"
              />
            </div>
          )}
          <Button onClick={confirmOutcome} disabled={saving} size="sm" className="w-full gap-2">
            {saving ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
            Confirm &amp; Next
          </Button>
        </div>
      )}
    </div>
  )

  // ─── Recording indicator (auto-managed — no manual button needed) ────────────

  const recordingIndicator = isRecording ? (
    <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-1.5 shrink-0">
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-red-500" />
      <span className="text-xs text-red-400 tabular-nums">{formatDuration(durationMs)}</span>
      <Sparkles className="ml-1 size-3 shrink-0 text-orange-400" />
    </div>
  ) : recordingState === "error" ? (
    <div className="flex items-center gap-1.5 rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-1.5 text-xs text-red-400/60 shrink-0">
      <span>No mic</span>
    </div>
  ) : null

  // ─── Power Dialer block ───────────────────────────────────────────────────────

  const powerDialerBlock = (
    <Suspense fallback={<div className="h-16 animate-pulse rounded-lg bg-muted" />}>
      <PowerDialer
        lead={currentLead}
        onCallComplete={undefined}
        onSkipToNext={skipLead}
        autoDialActive={false}
        onCancelAutoDial={() => setAutoDialActive(false)}
        onCallStateChange={handleCallStateChange}
        onRemoteStream={handleRemoteStream}
        onLocalStream={handleLocalStream}
        callerIdNumber={queue?.selectedNumber?.phone_number}
        hangUpRef={hangUpRef}
        countdownSeconds={15}
      />
    </Suspense>
  )

  // ─── Mobile layout ────────────────────────────────────────────────────────────

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768

  return (
    <>
      {/* ── DESKTOP LAYOUT ──────────────────────────────────────────────────── */}
      <div className="hidden md:flex md:flex-col md:gap-3">
        {/* Header */}
        {headerBar}

        {/* ── Call Controls + Disposition Bar (TOP — always visible) ────────── */}
        <div className="rounded-xl border bg-card px-4 py-3 shadow-sm space-y-3">
          {/* Row 1: Dialer + Recording + Skip */}
          <div className="flex items-center gap-3">
            {/* Power Dialer — main call button */}
            <div className="flex-1 min-w-0">
              {powerDialerBlock}
            </div>

            {/* Recording indicator (auto-starts with call) */}
            {recordingIndicator}

            <Separator orientation="vertical" className="h-6 self-auto" />

            {/* Skip → Next Call: logs as no_answer and auto-dials next */}
            <Button
              variant="outline"
              size="sm"
              onClick={skipAndDialNext}
              className="gap-1.5 shrink-0 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 hover:border-orange-500/50 font-medium"
            >
              <SkipForward className="size-4" />
              Skip → Next
            </Button>

            {/* Silent skip (no disposition, no auto-dial) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={skipLead}
              className="gap-1 text-muted-foreground shrink-0"
            >
              <SkipForward className="size-3.5" />
              Pass
            </Button>
          </div>

          {/* Row 2: Disposition buttons — always visible, right here at the top */}
          {dispositionBlock}
        </div>

        {/* Main 2-column area */}
        {!powerMode ? (
          <div className="grid grid-cols-2 gap-3" style={{ minHeight: "calc(100vh - 420px)" }}>
            {/* LEFT: Script Teleprompter */}
            <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ScriptTeleprompter />
              </Suspense>
            </div>

            {/* RIGHT: Objection Handler */}
            <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ObjectionHandler />
              </Suspense>
            </div>
          </div>
        ) : (
          /* Power Mode: script + objections side by side, no chrome */
          <div className="grid grid-cols-2 gap-3" style={{ height: "calc(100vh - 300px)" }}>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Suspense fallback={null}>
                <ScriptTeleprompter />
              </Suspense>
            </div>
            <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
              <Suspense fallback={null}>
                <ObjectionHandler />
              </Suspense>
            </div>
          </div>
        )}

        {/* Bottom Bar: Notes only (disposition is at the top now) */}
        {!powerMode && (
          <div data-pii className="rounded-xl border bg-card px-4 py-3 shadow-sm">
            <LiveNotes
              leadId={currentLead?.id ?? null}
              leadNotes={currentLead?.notes}
              onNotesChange={setLiveNotes}
            />
          </div>
        )}
      </div>

      {/* ── MOBILE LAYOUT ───────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {/* Lead info + timer */}
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          {currentLead && <LeadInfoCard lead={currentLead} />}
          <div className="mt-3 flex items-center justify-between">
            <StatsBar sessionDials={sessionDials} sessionDemos={sessionDemos} timeToday={sessionTime} />
            <Suspense fallback={null}>
              <CallTimerComp duration={0} callState="idle" />
            </Suspense>
          </div>
        </div>

        {/* Power Dialer — call button at top */}
        {powerDialerBlock}

        {/* Recording indicator */}
        {recordingIndicator && (
          <div className="px-1">{recordingIndicator}</div>
        )}

        {/* Disposition — right after dialer, before everything else */}
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          {dispositionBlock}
          <div className="mt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={skipAndDialNext}
              className="gap-1.5 border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-medium"
            >
              <SkipForward className="size-3.5" />
              Skip → Next
            </Button>
            <Button variant="ghost" size="sm" onClick={skipLead} className="gap-1 text-muted-foreground">
              <SkipForward className="size-3.5" />
              Pass
            </Button>
          </div>
        </div>

        {/* Notes */}
        <MobileSection label="📝 Live Notes" defaultOpen={true}>
          <div data-pii>
            <LiveNotes
              leadId={currentLead?.id ?? null}
              leadNotes={currentLead?.notes}
              onNotesChange={setLiveNotes}
            />
          </div>
        </MobileSection>

        {/* Script - collapsed */}
        <MobileSection label="📋 Script" defaultOpen={false}>
          <Suspense fallback={<Loader2 className="size-5 animate-spin" />}>
            <ScriptTeleprompter />
          </Suspense>
        </MobileSection>

        {/* Objections - collapsed */}
        <MobileSection label="🛡️ Objection Handler" defaultOpen={false}>
          <Suspense fallback={<Loader2 className="size-5 animate-spin" />}>
            <ObjectionHandler />
          </Suspense>
        </MobileSection>

        {/* Controls */}
        <div className="flex items-center justify-between rounded-xl border bg-card px-3 py-2 shadow-sm">
          <div className="flex gap-2">
            <Button
              variant={powerMode ? "default" : "outline"}
              size="sm"
              onClick={() => setPowerMode((v) => !v)}
              className={cn("gap-1", powerMode && "bg-orange-500 text-white hover:bg-orange-600")}
            >
              {powerMode ? <ZapOff className="size-3.5" /> : <Zap className="size-3.5" />}
              Power
            </Button>
            <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing} className="gap-1">
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
              Sync
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowShortcuts(true)} className="gap-1">
            <Keyboard className="size-3.5" />?
          </Button>
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────────────────── */}
      <KeyboardShortcuts open={showShortcuts} onClose={() => setShowShortcuts(false)} />

      {/* ── AI Analysis Toast (bottom center, non-blocking) ───────────── */}
      {aiPanelOpen && aiResult && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(480px,calc(100vw-2rem))]">
          {aiResult.panelState === "loading" && (
            <div className="rounded-xl border border-orange-500/30 bg-zinc-950/95 backdrop-blur-lg px-4 py-3 shadow-2xl flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-orange-400 flex-shrink-0" />
              <span className="text-sm text-muted-foreground">Analyzing call...</span>
              <button onClick={() => setAiPanelOpen(false)} className="ml-auto text-xs text-muted-foreground/50 hover:text-muted-foreground">✕</button>
            </div>
          )}
          {(aiResult.panelState === "accepted" || aiResult.panelState === "overridden") && (
            <div className="rounded-xl border border-emerald-500/30 bg-zinc-950/95 backdrop-blur-lg px-4 py-3 shadow-2xl flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span className="text-sm text-emerald-400 font-medium">
                {aiResult.panelState === "accepted" ? "AI accepted" : "Override saved"}
              </span>
            </div>
          )}
          {aiResult.panelState === "ready" && (
            <div className="rounded-xl border border-orange-500/30 bg-zinc-950/95 backdrop-blur-lg shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-orange-400 uppercase tracking-wide">AI Analysis</span>
                  {aiResult.suggestedDisposition && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-300">
                      {aiResult.suggestedDisposition.replace(/_/g, " ")}
                    </span>
                  )}
                </div>
                <button onClick={() => setAiPanelOpen(false)} className="text-xs text-muted-foreground/50 hover:text-muted-foreground">✕</button>
              </div>
              {/* Content */}
              <div className="px-4 pb-2 space-y-2 max-h-[200px] overflow-y-auto">
                {aiResult.suggestedNotes && (
                  <p className="text-xs text-foreground/80 leading-relaxed">{aiResult.suggestedNotes}</p>
                )}
                {aiResult.keyPoints && aiResult.keyPoints.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">Key Points</p>
                    {aiResult.keyPoints.map((p, i) => (
                      <p key={i} className="text-xs text-foreground/70 pl-2 border-l border-orange-500/20 mb-1">{p}</p>
                    ))}
                  </div>
                )}
                {aiResult.nextSteps && aiResult.nextSteps.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-1">Next Steps</p>
                    {aiResult.nextSteps.map((s, i) => (
                      <p key={i} className="text-xs text-foreground/70 pl-2 border-l border-emerald-500/20 mb-1">{s}</p>
                    ))}
                  </div>
                )}
              </div>
              {/* Actions */}
              <div className="px-4 pb-3 pt-1 flex items-center gap-2">
                <Button
                  size="sm"
                  className="flex-1 h-8 gap-1.5 bg-orange-600 hover:bg-orange-500 text-white border-0 text-xs font-bold"
                  onClick={() => {
                    handleAIAcceptAll({
                      disposition: aiResult.suggestedDisposition!,
                      notes: aiResult.suggestedNotes || "",
                      followUpDate: aiResult.suggestedFollowUpDate,
                    })
                    setAiPanelOpen(false)
                  }}
                >
                  <Sparkles className="h-3 w-3" />
                  Accept All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground border-zinc-700"
                  onClick={() => setAiPanelOpen(false)}
                >
                  Dismiss
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}