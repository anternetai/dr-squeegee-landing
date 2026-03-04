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
import { useSessionRecording, type SessionRecordingState, type WebcamCorner } from "@/lib/dialer/use-session-recording"
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

async function fetchQueue(): Promise<DialerQueueResponse> {
  const res = await fetch("/api/portal/dialer/queue?limit=500")
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

// ─── Recording Preview Monitor ────────────────────────────────────────────────

const CORNER_LABELS: Record<WebcamCorner, string> = {
  "top-left": "TL",
  "top-right": "TR",
  "bottom-left": "BL",
  "bottom-right": "BR",
}

function RecordingPreview({
  canvasRef,
  corner,
  onCornerChange,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  corner: WebcamCorner
  onCornerChange: (c: WebcamCorner) => void
}) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Mirror the compositing canvas onto a smaller preview canvas at ~5fps (low CPU)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const src = canvasRef.current
      const dst = previewRef.current
      if (src && dst && src.width > 0) {
        const ctx = dst.getContext("2d")
        if (ctx) {
          const aspect = src.width / (src.height || 1)
          if (dst.width !== 320) dst.width = 320
          const h = Math.round(320 / aspect)
          if (dst.height !== h) dst.height = h
          ctx.drawImage(src, 0, 0, dst.width, dst.height)
        }
      }
    }, 200) // 5fps
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [canvasRef])

  return (
    <div className="fixed bottom-4 left-4 z-[9998] flex flex-col gap-1.5 rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl shadow-black/60 overflow-hidden">
      {/* Preview header */}
      <div className="flex items-center justify-between px-2.5 py-1.5 bg-black/40">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[10px] font-medium text-white/60">Recording Preview</span>
        </div>
        {/* Corner position picker */}
        <div className="flex gap-0.5">
          {(Object.keys(CORNER_LABELS) as WebcamCorner[]).map((c) => (
            <button
              key={c}
              onClick={() => onCornerChange(c)}
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-colors ${
                corner === c
                  ? "bg-orange-500/30 text-orange-400"
                  : "text-white/30 hover:text-white/60 hover:bg-white/5"
              }`}
              title={`Move webcam to ${c.replace("-", " ")}`}
            >
              {CORNER_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
      {/* Canvas preview */}
      <canvas
        ref={previewRef}
        className="w-80 bg-black"
      />
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function CallCockpit() {
  const {
    data: queue,
    isLoading,
    mutate,
  } = useSWR("cold-call-queue-cockpit", fetchQueue, {
    revalidateOnFocus: true,
    refreshInterval: 120000,
  })

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
  const sessionTime = useSessionTimer()

  // Remote audio stream ref — set by PowerDialer's onRemoteStream callback
  const remoteStreamRef = useRef<MediaStream | null>(null)

  // Mixed audio recording (both sides of the call)
  const { recordingState, durationMs, startRecording, stopRecording, reset: resetRecording, mixedStreamRef } =
    useMixedAudioRecording({ remoteStreamRef })
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
  } = useSessionRecording({
    webcamStreamRef: webcamStreamForSessionRef,
    webcamCanvasRef: webcamCanvasForSessionRef,
    mixedAudioStreamRef: mixedStreamRef,
  })

  // Recording blob from last call (for AI analysis)
  const lastCallBlobRef = useRef<Blob | null>(null)
  // Snapshot of the lead being called — so auto-submit uses correct lead even after advancing
  const callLeadRef = useRef<DialerLead | null>(null)

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
        }),
      })
    },
    []
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
    [startRecording, stopRecording, durationMs, currentLead, currentIndex, leads.length, mutate, submitDisposition, resetForm, resetRecording]
  )

  useEffect(() => {
    if (leads.length > 0 && currentIndex >= leads.length) setCurrentIndex(0)
  }, [leads.length, currentIndex])

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
      setAiPanelOpen(true)
      try {
        // Upload audio blob to /api/portal/calls/transcribe — runs Whisper + AI analysis
        const formData = new FormData()
        const ext = blob.type.includes("ogg") ? "ogg" : "webm"
        formData.append("audio", blob, `call_${Date.now()}.${ext}`)
        formData.append("lead_id", lead.id)
        formData.append("duration_seconds", String(Math.floor(durationMs / 1000)))

        const res = await fetch("/api/portal/calls/transcribe", {
          method: "POST",
          body: formData,
        })

        if (!res.ok) throw new Error("Transcription failed")
        const data = await res.json()

        const analysis = data.analysis
        setAiResult({
          panelState: "ready",
          suggestedDisposition: analysis?.disposition || (outcome as DialerOutcome),
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
      if (!currentLead || saving) return

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
        const leadSnap = currentLead
        const notesSnap = liveNotes || notes
        const demoDateSnap = demoDate

        // Stop any live recording and grab the blob
        let blob: Blob | null = lastCallBlobRef.current
        lastCallBlobRef.current = null
        if (isRecording) {
          blob = await stopRecording()
        }

        setSessionDials((c) => c + 1)
        if (outcome === "demo_booked") setSessionDemos((c) => c + 1)

        resetForm()
        resetRecording()

        // Advance to next lead
        if (currentIndex < leads.length - 1) {
          setCurrentIndex((i) => i + 1)
        } else {
          await mutate()
          setCurrentIndex(0)
        }

        // Always submit the disposition
        await submitDisposition(leadSnap, outcome, notesSnap, demoDateSnap)

        // Only trigger auto-dial AFTER everything is done and only if no call is active.
        // Use a short delay so the state updates propagate first.
        const cs = currentCallStateRef.current
        if (cs === "idle" || cs === "disconnected") {
          setAutoDialActive(true)
        }
        // If a call is somehow still active, don't auto-dial — user will manually proceed

        // Run AI analysis in background if we have a recording (non-blocking)
        // Upload for ALL outcomes that have recordings (not just conversation)
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

    // Advance to next lead
    if (currentIndex < leads.length - 1) {
      setCurrentIndex((i) => i + 1)
    } else {
      await mutate()
      setCurrentIndex(0)
    }

    // Only trigger auto-dial if no call is active
    const cs = currentCallStateRef.current
    if (cs === "idle" || cs === "disconnected") {
      setAutoDialActive(true)
    }
  }, [currentLead, currentIndex, leads.length, mutate, resetForm, submitDisposition])

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

  // Start session recording — auto-enable webcam, then refresh refs
  const handleStartSessionRecording = useCallback(async () => {
    if (webcamRef.current) {
      // Auto-enable webcam if not already on
      webcamRef.current.enable()
      // Small delay to let camera start before grabbing refs
      await new Promise((r) => setTimeout(r, 500))
      webcamStreamForSessionRef.current = webcamRef.current.getStream()
      webcamCanvasForSessionRef.current = webcamRef.current.getCanvas()
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
        autoDialActive={autoDialActive}
        onCancelAutoDial={() => setAutoDialActive(false)}
        onCallStateChange={handleCallStateChange}
        onRemoteStream={handleRemoteStream}
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

      {/* Recording preview monitor — shown while session recording is active */}
      {sessionRecState === "recording" && (
        <RecordingPreview
          canvasRef={sessionPreviewCanvasRef}
          corner={sessionWebcamCorner}
          onCornerChange={setSessionWebcamCorner}
        />
      )}

      <AIAnalysisPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        result={aiResult}
        businessName={pendingLead?.business_name ?? undefined}
        onAcceptAll={handleAIAcceptAll}
        onOverride={handleAIOverride}
      />
    </>
  )
}