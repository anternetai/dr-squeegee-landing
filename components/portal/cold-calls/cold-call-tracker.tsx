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
  Zap,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { DialerLead, DialerOutcome, DialerQueueResponse } from "@/lib/dialer/types"

// Simplified outcomes for cold calling
type ColdCallOutcome = "no_answer" | "voicemail" | "conversation" | "wrong_number" | "not_interested" | "demo_booked"

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
    bgColor: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10 ring-2 ring-purple-500/20",
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

async function fetchQueue(): Promise<DialerQueueResponse> {
  const res = await fetch("/api/portal/dialer/queue?limit=100")
  if (!res.ok) throw new Error("Failed to fetch queue")
  return res.json()
}

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
  const notesRef = useRef<HTMLTextAreaElement>(null)

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
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentLead, saving, showNoteField, selectedOutcome, notes, demoDate]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = useCallback(() => {
    setNotes("")
    setDemoDate("")
    setShowNoteField(false)
    setShowDemoDatePicker(false)
    setSelectedOutcome(null)
  }, [])

  const handleDisposition = useCallback(
    async (outcome: ColdCallOutcome) => {
      if (!currentLead || saving) return

      // For conversation / demo_booked, show note field first
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
        const res = await fetch("/api/portal/dialer/disposition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: currentLead.id,
            outcome: outcome as DialerOutcome,
            notes: notes || undefined,
            demoDate: demoDate || undefined,
          }),
        })

        if (!res.ok) throw new Error("Failed to save disposition")

        setSessionDials((c) => c + 1)
        if (outcome === "demo_booked") setSessionDemos((c) => c + 1)
        resetForm()

        // Auto-advance
        if (currentIndex < leads.length - 1) {
          setCurrentIndex((i) => i + 1)
        } else {
          await mutate()
          setCurrentIndex(0)
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
      currentIndex,
      leads.length,
      mutate,
      resetForm,
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
      if (data.success) {
        await mutate()
      }
    } catch (e) {
      console.error("Sync error:", e)
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
          {syncing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileDown className="size-4" />
          )}
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

            {/* Big Call Button */}
            <a
              href={`tel:${toE164(currentLead.phone_number || "")}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <Phone className="size-6" />
              <span>CALL {formatPhone(currentLead.phone_number)}</span>
            </a>

            {/* Previous Notes */}
            {currentLead.notes && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Previous Notes
                </p>
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
                What happened? (⌘1-6)
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
                <Button
                  onClick={confirmOutcome}
                  disabled={saving}
                  className="w-full gap-2"
                >
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

      {/* Up Next Queue */}
      {leads.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Up Next ({leads.length - 1 - currentIndex} remaining)
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

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
