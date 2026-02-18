"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import useSWR from "swr"
import {
  Phone,
  PhoneOff,
  UserCheck,
  MessageSquare,
  CalendarCheck,
  XCircle,
  Voicemail,
  Clock,
  ArrowRight,
  SkipForward,
  Globe,
  User,
  Building2,
  MapPin,
  Hash,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { DialerLead, DialerOutcome, DialerQueueResponse } from "@/lib/dialer/types"

const OUTCOME_CONFIG: Record<
  DialerOutcome,
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
  gatekeeper: {
    label: "Gatekeeper",
    icon: XCircle,
    color: "text-amber-500",
    bgColor: "border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10",
    shortcut: "3",
  },
  conversation: {
    label: "Conversation",
    icon: MessageSquare,
    color: "text-emerald-500",
    bgColor: "border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10",
    shortcut: "4",
  },
  demo_booked: {
    label: "Demo Booked!",
    icon: CalendarCheck,
    color: "text-purple-500",
    bgColor: "border-purple-500/20 hover:border-purple-500/50 hover:bg-purple-500/10",
    shortcut: "5",
  },
  not_interested: {
    label: "Not Interested",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "border-red-500/20 hover:border-red-500/50 hover:bg-red-500/10",
    shortcut: "6",
  },
  wrong_number: {
    label: "Wrong Number",
    icon: AlertCircle,
    color: "text-red-400",
    bgColor: "border-red-400/20 hover:border-red-400/50 hover:bg-red-400/10",
    shortcut: "7",
  },
  callback: {
    label: "Callback",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10",
    shortcut: "8",
  },
}

async function fetchQueue(): Promise<DialerQueueResponse> {
  const res = await fetch("/api/portal/dialer/queue")
  if (!res.ok) throw new Error("Failed to fetch queue")
  return res.json()
}

export function PowerDialer() {
  const { data: queue, isLoading, mutate } = useSWR("dialer-queue", fetchQueue, {
    revalidateOnFocus: true,
    refreshInterval: 60000, // refresh every minute
  })

  const [currentIndex, setCurrentIndex] = useState(0)
  const [notes, setNotes] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [callbackDate, setCallbackDate] = useState("")
  const [callbackTime, setCallbackTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [showNoteField, setShowNoteField] = useState(false)
  const [showDemoDatePicker, setShowDemoDatePicker] = useState(false)
  const [showCallbackPicker, setShowCallbackPicker] = useState(false)
  const [sessionDials, setSessionDials] = useState(0)
  const [lastOutcome, setLastOutcome] = useState<DialerOutcome | null>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)

  const leads = queue?.leads || []
  const currentLead = leads[currentIndex] || null

  // Reset index when queue changes
  useEffect(() => {
    if (leads.length > 0 && currentIndex >= leads.length) {
      setCurrentIndex(0)
    }
  }, [leads.length, currentIndex])

  const resetForm = useCallback(() => {
    setNotes("")
    setDemoDate("")
    setCallbackDate("")
    setCallbackTime("")
    setShowNoteField(false)
    setShowDemoDatePicker(false)
    setShowCallbackPicker(false)
    setLastOutcome(null)
  }, [])

  const handleDisposition = useCallback(
    async (outcome: DialerOutcome) => {
      if (!currentLead || saving) return

      // For certain outcomes, show extra fields first
      if (outcome === "conversation" && !showNoteField) {
        setShowNoteField(true)
        setLastOutcome(outcome)
        setTimeout(() => notesRef.current?.focus(), 100)
        return
      }
      if (outcome === "demo_booked" && !showDemoDatePicker) {
        setShowDemoDatePicker(true)
        setShowNoteField(true)
        setLastOutcome(outcome)
        return
      }
      if (outcome === "callback" && !showCallbackPicker) {
        setShowCallbackPicker(true)
        setLastOutcome(outcome)
        return
      }

      setSaving(true)
      try {
        const callbackAt =
          callbackDate && callbackTime
            ? new Date(`${callbackDate}T${callbackTime}`).toISOString()
            : callbackDate
              ? new Date(`${callbackDate}T09:00:00`).toISOString()
              : undefined

        const res = await fetch("/api/portal/dialer/disposition", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: currentLead.id,
            outcome,
            notes: notes || undefined,
            demoDate: demoDate || undefined,
            callbackAt,
          }),
        })

        if (!res.ok) throw new Error("Failed to log disposition")

        setSessionDials((c) => c + 1)
        resetForm()

        // Advance to next lead
        if (currentIndex < leads.length - 1) {
          setCurrentIndex((i) => i + 1)
        } else {
          // Refresh queue for more leads
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
      showCallbackPicker,
      notes,
      demoDate,
      callbackDate,
      callbackTime,
      currentIndex,
      leads.length,
      mutate,
      resetForm,
    ]
  )

  const confirmOutcome = useCallback(() => {
    if (lastOutcome) {
      handleDisposition(lastOutcome)
    }
  }, [lastOutcome, handleDisposition])

  const skipLead = useCallback(() => {
    if (currentIndex < leads.length - 1) {
      setCurrentIndex((i) => i + 1)
      resetForm()
    }
  }, [currentIndex, leads.length, resetForm])

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return

      if (e.ctrlKey || e.metaKey) {
        const outcomes: DialerOutcome[] = [
          "no_answer", "voicemail", "gatekeeper", "conversation",
          "demo_booked", "not_interested", "wrong_number", "callback",
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
  }, [handleDisposition])

  const progressPercent = queue
    ? Math.min(((queue.completedToday + sessionDials) / Math.max(queue.totalToday, 1)) * 100, 100)
    : 0

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Morning greeting / daily summary
  const totalToCall = queue?.totalToday || 0
  const completedSoFar = (queue?.completedToday || 0) + sessionDials
  const callbacksCount = queue?.callbacksDue?.length || 0
  const tz = queue?.breakdownByTimezone

  return (
    <div className="space-y-4">
      {/* Daily Summary Bar */}
      <Card className="border-orange-500/20 bg-gradient-to-r from-orange-500/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-lg font-semibold">
                {getGreeting()}{" "}
                <span className="text-orange-500">{totalToCall}</span> leads to call today.
              </p>
              {queue?.currentHourBlock && (
                <p className="text-sm text-muted-foreground">
                  Current block: {queue.currentHourBlock}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {callbacksCount > 0 && (
                <Badge variant="outline" className="border-orange-500/40 text-orange-500">
                  <Clock className="mr-1 size-3" />
                  {callbacksCount} callback{callbacksCount !== 1 ? "s" : ""} due
                </Badge>
              )}
              <Badge variant="secondary" className="tabular-nums">
                {sessionDials} this session
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{completedSoFar} calls made today</span>
              <span>{totalToCall} total in queue</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Timezone Breakdown */}
          {tz && (
            <div className="mt-3 flex flex-wrap gap-3">
              {(["ET", "CT", "MT", "PT"] as const).map((t) => (
                <div
                  key={t}
                  className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs ${
                    queue?.currentTimezone === t
                      ? "border-orange-500/40 bg-orange-500/10 font-medium text-orange-500"
                      : "text-muted-foreground"
                  }`}
                >
                  <MapPin className="size-3" />
                  {t}: {tz[t]}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Lead Card */}
      {currentLead ? (
        <Card className="overflow-hidden border-2">
          <CardHeader className="border-b bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="size-4 text-orange-500" />
                {currentLead.business_name || "Unknown Business"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="tabular-nums text-xs">
                  <Hash className="mr-0.5 size-3" />
                  {currentLead.attempt_count}/{currentLead.max_attempts} attempts
                </Badge>
                {currentLead.timezone && (
                  <Badge variant="secondary" className="text-xs">
                    {currentLead.timezone}
                  </Badge>
                )}
                {currentLead.status === "callback" && (
                  <Badge variant="outline" className="border-orange-500/40 text-xs text-orange-500">
                    Callback
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
                  {currentLead.first_name || currentLead.owner_name || "—"}
                </span>
                {currentLead.owner_name && currentLead.first_name && (
                  <span className="text-muted-foreground">({currentLead.owner_name})</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-muted-foreground" />
                <span>{currentLead.state || "—"}</span>
              </div>
            </div>

            {/* Big DIAL Button */}
            <a
              href={`tel:${currentLead.phone_number}`}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-600 px-6 py-5 text-lg font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-[0.98]"
            >
              <Phone className="size-6" />
              <span>DIAL {formatPhone(currentLead.phone_number)}</span>
            </a>

            {/* Website link */}
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
                {currentLead.website}
                <ExternalLink className="size-3" />
              </a>
            )}

            {/* Previous Notes */}
            {currentLead.notes && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Previous Notes</p>
                <p className="whitespace-pre-wrap text-sm">{currentLead.notes}</p>
              </div>
            )}

            {/* Last Outcome */}
            {currentLead.last_outcome && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Last:</span>
                <Badge variant="outline" className="text-xs">
                  {OUTCOME_CONFIG[currentLead.last_outcome]?.label || currentLead.last_outcome}
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
                Tap outcome after call (or ⌘1-8)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(Object.entries(OUTCOME_CONFIG) as [DialerOutcome, (typeof OUTCOME_CONFIG)[DialerOutcome]][]).map(
                  ([key, config]) => {
                    const Icon = config.icon
                    return (
                      <Button
                        key={key}
                        variant="outline"
                        className={`h-auto flex-col gap-1 py-3 ${config.bgColor} ${
                          lastOutcome === key ? "ring-2 ring-orange-500 ring-offset-2 ring-offset-background" : ""
                        }`}
                        disabled={saving}
                        onClick={() => handleDisposition(key)}
                      >
                        <Icon className={`size-5 ${config.color}`} />
                        <span className="text-xs font-medium">{config.label}</span>
                        <span className="text-[10px] text-muted-foreground">⌘{config.shortcut}</span>
                      </Button>
                    )
                  }
                )}
              </div>
            </div>

            {/* Extra Fields (shown conditionally) */}
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
                    <label className="text-xs font-medium text-muted-foreground">Demo date:</label>
                    <Input
                      type="datetime-local"
                      value={demoDate}
                      onChange={(e) => setDemoDate(e.target.value)}
                      className="h-8 w-auto text-sm"
                    />
                  </div>
                )}
                {showCallbackPicker && (
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Callback:</label>
                    <Input
                      type="date"
                      value={callbackDate}
                      onChange={(e) => setCallbackDate(e.target.value)}
                      className="h-8 w-auto text-sm"
                    />
                    <Input
                      type="time"
                      value={callbackTime}
                      onChange={(e) => setCallbackTime(e.target.value)}
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

            {/* Skip Button */}
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
              {queue?.totalToday === 0
                ? "Import leads to get started, or check back during calling hours."
                : "All leads for this time block have been called. Nice work! 🎉"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Queue Preview */}
      {leads.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Up Next ({leads.length - 1 - currentIndex} remaining)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {leads.slice(currentIndex + 1, currentIndex + 6).map((lead, i) => (
                <div
                  key={lead.id}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50"
                >
                  <span className="w-5 text-center text-xs text-muted-foreground">{i + 1}</span>
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

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning."
  if (hour < 17) return "Good afternoon."
  return "Good evening."
}
