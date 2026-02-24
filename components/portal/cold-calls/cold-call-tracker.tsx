"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  Phone,
  PhoneOff,
  MessageSquare,
  CalendarCheck,
  XCircle,
  Voicemail,
  SkipForward,
  Globe,
  User,
  Building2,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Hash,
  FileDown,
  PhoneCall,
  TrendingUp,
  Target,
  Mic,
  MicOff,
  Radio,
  Calendar,
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { DialerLead, DialerOutcome, DialerQueueResponse } from "@/lib/dialer/types"
import type { AIAnalysisResult, RecordingState } from "@/lib/dialer/ai-types"
import { AIAnalysisPanel } from "./ai-analysis-panel"
import { FollowUpList } from "./follow-up-list"

// ─── Types & Config ───────────────────────────────────────────────────────────

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
    label: "Wrong Number",
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
    bgColor:
      "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10 ring-2 ring-purple-500/20",
    shortcut: "6",
  },
}

interface SyncResult {
  success: boolean
  totalRows: number
  imported: number
  duplicates: number
  skipped: number
  errors: string[]
}

// ─── Utility Helpers ──────────────────────────────────────────────────────────

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
  const res = await fetch("/api/portal/dialer/queue?limit=100")
  if (!res.ok) throw new Error("Failed to fetch queue")
  return res.json()
}

// ─── Recording Hook ───────────────────────────────────────────────────────────

function useCallRecording() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle")
  const [durationMs, setDurationMs] = useState(0)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const startTime = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "audio/ogg"
      const recorder = new MediaRecorder(stream, { mimeType })
      chunks.current = []
      startTime.current = Date.now()

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data)
      }

      recorder.start(1000)
      mediaRecorder.current = recorder
      setRecordingState("recording")
      setDurationMs(0)

      timerRef.current = setInterval(() => {
        setDurationMs(Date.now() - startTime.current)
      }, 1000)
    } catch {
      setRecordingState("error")
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (!mediaRecorder.current || mediaRecorder.current.state === "inactive") {
        setRecordingState("idle")
        resolve(null)
        return
      }
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: mediaRecorder.current?.mimeType || "audio/webm",
        })
        mediaRecorder.current?.stream.getTracks().forEach((t) => t.stop())
        setRecordingState("stopped")
        resolve(blob)
      }
      mediaRecorder.current.stop()
    })
  }, [])

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    setRecordingState("idle")
    setDurationMs(0)
    chunks.current = []
  }, [])

  return { recordingState, durationMs, startRecording, stopRecording, reset }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ColdCallTracker() {
  const {
    data: queue,
    isLoading,
    mutate,
  } = useSWR("cold-call-queue", fetchQueue, {
    revalidateOnFocus: true,
    refreshInterval: 120000,
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [notes, setNotes] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)
  const [showNoteField, setShowNoteField] = useState(false)
  const [showDemoDatePicker, setShowDemoDatePicker] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<ColdCallOutcome | null>(null)
  const [sessionDials, setSessionDials] = useState(0)
  const [sessionDemos, setSessionDemos] = useState(0)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null)
  const [pendingLead, setPendingLead] = useState<DialerLead | null>(null)
  const [pendingOutcome, setPendingOutcome] = useState<ColdCallOutcome | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const { recordingState, durationMs, startRecording, stopRecording, reset: resetRecording } =
    useCallRecording()

  const isRecording = recordingState === "recording"

  const leads = queue?.leads || []
  const currentLead = leads[currentIndex] || null

  useEffect(() => {
    if (leads.length > 0 && currentIndex >= leads.length) setCurrentIndex(0)
  }, [leads.length, currentIndex])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      if (e.ctrlKey || e.metaKey) {
        const outcomes: ColdCallOutcome[] = [
          "no_answer",
          "voicemail",
          "conversation",
          "wrong_number",
          "not_interested",
          "demo_booked",
        ]
        const idx = parseInt(e.key) - 1
        if (idx >= 0 && idx < outcomes.length) {
          e.preventDefault()
          handleDisposition(outcomes[idx])
        }
        if (e.key === "r") {
          e.preventDefault()
          if (isRecording) stopRecording()
          else startRecording()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentLead, saving, showNoteField, selectedOutcome, notes, demoDate, isRecording]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = useCallback(() => {
    setNotes("")
    setDemoDate("")
    setShowNoteField(false)
    setShowDemoDatePicker(false)
    setSelectedOutcome(null)
  }, [])

  const submitDisposition = useCallback(
    async (lead: DialerLead, outcome: ColdCallOutcome, notesText: string, demoDateStr: string) => {
      const res = await fetch("/api/portal/dialer/disposition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: lead.id,
          outcome: outcome as DialerOutcome,
          notes: notesText || undefined,
          demoDate: demoDateStr || undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed to save disposition")
    },
    []
  )

  const runAIAnalysis = useCallback(
    async (lead: DialerLead, outcome: ColdCallOutcome, blob: Blob | null) => {
      setAiResult({ panelState: "loading" })
      setAiPanelOpen(true)

      try {
        const transcript = "" // Will be filled by STT integration
        const res = await fetch("/api/portal/dialer/summarize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            businessName: lead.business_name || "",
            leadContext: lead.notes || "",
            leadId: lead.id,
            phoneNumber: lead.phone_number || "",
            durationSeconds: blob ? Math.floor(durationMs / 1000) : undefined,
          }),
        })

        if (!res.ok) throw new Error("AI analysis failed")
        const data = await res.json()

        setAiResult({
          panelState: "ready",
          suggestedDisposition: (data.disposition as DialerOutcome) || (outcome as DialerOutcome),
          suggestedNotes: data.notes || undefined,
          suggestedFollowUpDate: data.followUpDate || undefined,
          summary: data.summary || undefined,
          keyPoints: data.keyPoints || [],
          objections: data.objections || [],
          nextSteps: data.nextSteps || [],
          grades: data.grades,
          coachingTips: data.coachingTips,
          rawTranscript: transcript || undefined,
        })
      } catch {
        // Fallback: use the user-selected outcome
        setAiResult({
          panelState: "ready",
          suggestedDisposition: outcome as DialerOutcome,
          summary: "AI analysis unavailable. Please review and confirm manually.",
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
        const notesSnap = notes
        const demoDateSnap = demoDate
        const wasRecording = isRecording

        let blob: Blob | null = null
        if (wasRecording) {
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

        if (wasRecording && blob) {
          // Show AI panel for review
          setPendingLead(leadSnap)
          setPendingOutcome(outcome)
          await runAIAnalysis(leadSnap, outcome, blob)
        } else {
          // Direct save without AI
          await submitDisposition(leadSnap, outcome, notesSnap, demoDateSnap)
        }
      } catch (e) {
        console.error("Disposition error:", e)
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
      demoDate,
      isRecording,
      currentIndex,
      leads.length,
      mutate,
      resetForm,
      resetRecording,
      stopRecording,
      runAIAnalysis,
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

  const handleSync = useCallback(async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch("/api/portal/cold-calls/sync", { method: "POST" })
      const data = await res.json()
      setSyncResult(data)
      if (data.success) await mutate()
    } catch {
      setSyncResult({
        success: false,
        totalRows: 0,
        imported: 0,
        duplicates: 0,
        skipped: 0,
        errors: ["Failed to sync"],
      })
    } finally {
      setSyncing(false)
    }
  }, [mutate])

  const handleAIAcceptAll = useCallback(
    async (data: { disposition: DialerOutcome; notes: string; followUpDate?: string }) => {
      if (!pendingLead) return
      await submitDisposition(pendingLead, data.disposition as ColdCallOutcome, data.notes, data.followUpDate || "")
      setAiResult((prev) => (prev ? { ...prev, panelState: "accepted" } : null))
      setPendingLead(null)
      setPendingOutcome(null)
    },
    [pendingLead, submitDisposition]
  )

  const handleAIOverride = useCallback(
    async (data: { disposition: DialerOutcome; notes: string; followUpDate?: string }) => {
      if (!pendingLead) return
      await submitDisposition(pendingLead, data.disposition as ColdCallOutcome, data.notes, data.followUpDate || "")
      setAiResult((prev) => (prev ? { ...prev, panelState: "overridden" } : null))
      setPendingLead(null)
      setPendingOutcome(null)
    },
    [pendingLead, submitDisposition]
  )

  // Stats
  const totalInQueue = queue?.totalToday || 0
  const completedToday = (queue?.completedToday || 0) + sessionDials
  const conversionRate =
    completedToday > 0 ? ((sessionDemos / Math.max(sessionDials, 1)) * 100).toFixed(1) : "0.0"

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Cold Call Tracker</h1>
            <p className="text-sm text-muted-foreground">
              {totalInQueue.toLocaleString()} leads in queue
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSync}
            disabled={syncing}
            className="gap-2"
          >
            {syncing ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {syncing ? "Syncing..." : "Sync from Google Sheet"}
          </Button>
        </div>

        {/* Sync Result Banner */}
        {syncResult && (
          <Card
            className={
              syncResult.success
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-red-500/20 bg-red-500/5"
            }
          >
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  {syncResult.success ? "✅" : "❌"}{" "}
                  {syncResult.success
                    ? `Synced ${syncResult.imported} new leads (${syncResult.duplicates} existing, ${syncResult.skipped} skipped)`
                    : `Sync failed: ${syncResult.errors[0]}`}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSyncResult(null)}
                  className="h-6 px-2 text-xs"
                >
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-orange-500/10">
                <PhoneCall className="size-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{sessionDials}</p>
                <p className="text-xs text-muted-foreground">Calls Today</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-purple-500/10">
                <CalendarCheck className="size-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{sessionDemos}</p>
                <p className="text-xs text-muted-foreground">Demos Booked</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <TrendingUp className="size-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground">Book Rate</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Target className="size-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold tabular-nums">{totalInQueue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">In Queue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress */}
        {completedToday > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedToday} calls made today</span>
              <span>{totalInQueue} remaining</span>
            </div>
            <Progress
              value={Math.min(
                (completedToday / Math.max(completedToday + totalInQueue, 1)) * 100,
                100
              )}
              className="h-2"
            />
          </div>
        )}

        {/* Current Lead Card */}
        {currentLead ? (
          <Card className="overflow-hidden border-2">
            <CardHeader className="border-b bg-muted/30 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="size-5 text-orange-500" />
                  {currentLead.business_name || "Unknown Business"}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="tabular-nums text-xs">
                    <Hash className="mr-0.5 size-3" />
                    {currentLead.attempt_count}/{currentLead.max_attempts}
                  </Badge>
                  {currentLead.state && (
                    <Badge variant="secondary" className="text-xs">
                      {currentLead.state}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Lead Info */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="size-4 text-muted-foreground" />
                  <span className="font-medium">
                    {currentLead.owner_name || currentLead.first_name || "—"}
                  </span>
                </div>
                {currentLead.website && (
                  <a
                    href={
                      currentLead.website.startsWith("http")
                        ? currentLead.website
                        : `https://${currentLead.website}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400"
                  >
                    <Globe className="size-4" />
                    <span className="truncate">{currentLead.website}</span>
                    <ExternalLink className="size-3 shrink-0" />
                  </a>
                )}
              </div>

              {/* Call Button + Record Toggle */}
              <div className="flex items-stretch gap-2">
                <a
                  href={`tel:${toE164(currentLead.phone_number || "")}`}
                  className="flex flex-1 items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]"
                >
                  <Phone className="size-6" />
                  <span>CALL {formatPhone(currentLead.phone_number)}</span>
                </a>

                {/* Record button */}
                <button
                  type="button"
                  onClick={() => (isRecording ? stopRecording() : startRecording())}
                  title={isRecording ? "Stop recording (⌘R)" : "Record call for AI analysis (⌘R)"}
                  className={[
                    "flex flex-col items-center justify-center gap-1 rounded-xl border-2 px-4 py-3 text-xs font-medium transition-all",
                    isRecording
                      ? "border-red-500 bg-red-500/10 text-red-400"
                      : recordingState === "error"
                      ? "border-red-400/30 bg-red-400/5 text-red-400/60 cursor-not-allowed"
                      : "border-muted-foreground/20 text-muted-foreground hover:border-orange-400/60 hover:bg-orange-500/5 hover:text-orange-400",
                  ].join(" ")}
                >
                  {isRecording ? (
                    <>
                      <div className="relative">
                        <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-red-500" />
                        <Radio className="size-4" />
                      </div>
                      <span className="tabular-nums">{formatDuration(durationMs)}</span>
                    </>
                  ) : recordingState === "error" ? (
                    <>
                      <MicOff className="size-4" />
                      <span>No mic</span>
                    </>
                  ) : (
                    <>
                      <Mic className="size-4" />
                      <span>Record</span>
                    </>
                  )}
                </button>
              </div>

              {/* Recording active banner */}
              {isRecording && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2">
                  <span className="size-2 animate-pulse rounded-full bg-red-500 shrink-0" />
                  <span className="text-xs text-red-400">
                    Recording — AI will analyze when you log the outcome
                  </span>
                  <Sparkles className="ml-auto size-3 shrink-0 text-orange-400" />
                </div>
              )}

              {/* Previous Notes */}
              {currentLead.notes && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Previous Notes</p>
                  <p className="whitespace-pre-wrap text-sm">{currentLead.notes}</p>
                </div>
              )}

              {/* Last outcome */}
              {currentLead.last_outcome && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Last:</span>
                  <Badge variant="outline" className="text-xs">
                    {OUTCOME_CONFIG[currentLead.last_outcome as ColdCallOutcome]?.label ||
                      currentLead.last_outcome}
                  </Badge>
                  {currentLead.last_called_at && (
                    <span>
                      {new Date(currentLead.last_called_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}

              {/* Disposition Buttons */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  What happened?{" "}
                  <span className="opacity-60">(⌘1–6)</span>
                  {isRecording && (
                    <span className="ml-2 inline-flex items-center gap-1 text-orange-400">
                      <Sparkles className="size-2.5" /> AI will analyze
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {(
                    Object.entries(OUTCOME_CONFIG) as [
                      ColdCallOutcome,
                      (typeof OUTCOME_CONFIG)[ColdCallOutcome],
                    ][]
                  ).map(([key, config]) => {
                    const Icon = config.icon
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className={`h-auto flex-col gap-1 py-3 ${config.bgColor} ${
                          selectedOutcome === key
                            ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background"
                            : ""
                        }`}
                        disabled={saving}
                        onClick={() => handleDisposition(key)}
                      >
                        <Icon className={`size-5 ${config.color}`} />
                        <span className="text-xs font-medium">{config.label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ⌘{config.shortcut}
                        </span>
                      </Button>
                    )
                  })}
                </div>
              </div>

              {/* Note / Demo Date Fields */}
              {showNoteField && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <Textarea
                    ref={notesRef}
                    placeholder="Add notes about this call..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  {showDemoDatePicker && (
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        Demo date:
                      </label>
                      <Input
                        type="datetime-local"
                        value={demoDate}
                        onChange={(e) => setDemoDate(e.target.value)}
                        className="h-8 w-auto text-sm"
                      />
                    </div>
                  )}
                  <Button onClick={confirmOutcome} disabled={saving} className="w-full gap-2">
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ChevronRight className="size-4" />
                    )}
                    Confirm &amp; Next
                  </Button>
                </div>
              )}

              {/* Skip */}
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipLead}
                  className="gap-1 text-muted-foreground"
                >
                  <SkipForward className="size-3.5" />
                  Skip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Phone className="mb-4 size-12 text-muted-foreground/40" />
              <h3 className="text-lg font-semibold">No leads in queue</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {totalInQueue === 0
                  ? "Sync leads from Google Sheets to get started."
                  : "All leads for this time block have been called. Nice work! 🎉"}
              </p>
              {totalInQueue === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={syncing}
                  className="mt-4 gap-2"
                >
                  {syncing ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  Sync from Google Sheet
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Up Next / Follow-Ups Tabs */}
        {leads.length > 0 && (
          <Tabs defaultValue="queue">
            <TabsList className="w-full">
              <TabsTrigger value="queue" className="flex-1">
                Queue ({leads.length - 1 - currentIndex > 0 ? leads.length - 1 - currentIndex : 0})
              </TabsTrigger>
              <TabsTrigger value="followups" className="flex-1 gap-1.5">
                <Calendar className="size-3" />
                Follow-Ups
              </TabsTrigger>
            </TabsList>

            <TabsContent value="queue">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Up Next ({Math.max(0, leads.length - 1 - currentIndex)} remaining)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {leads.slice(currentIndex + 1, currentIndex + 8).map((lead, i) => (
                      <div
                        key={lead.id}
                        className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                      >
                        <span className="w-5 text-center text-xs text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">
                          {lead.business_name || lead.phone_number || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lead.first_name || lead.owner_name || ""}
                        </span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {lead.state || "—"}
                        </Badge>
                        {lead.attempt_count > 0 && (
                          <span className="text-[10px] tabular-nums text-muted-foreground">
                            #{lead.attempt_count}
                          </span>
                        )}
                      </div>
                    ))}
                    {leads.length - 1 - currentIndex === 0 && (
                      <p className="py-4 text-center text-xs text-muted-foreground">
                        No more leads after this one.
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="followups">
              <FollowUpList leads={leads} />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* AI Analysis Panel (Sheet) */}
      <AIAnalysisPanel
        open={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        result={aiResult}
        businessName={pendingLead?.business_name || undefined}
        onAcceptAll={handleAIAcceptAll}
        onOverride={handleAIOverride}
      />
    </>
  )
}