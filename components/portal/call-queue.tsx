"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Phone,
  SkipForward,
  Mail,
  StickyNote,
  CheckCircle2,
  PhoneOff,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CALL_OUTCOME_CONFIG } from "@/lib/portal/constants"
import { formatPhone, handleCall } from "@/lib/portal/format"
import type { CrmProspect } from "@/lib/portal/types"

interface CallQueueProps {
  prospects: CrmProspect[]
  isLoading: boolean
  onUpdate: (id: string, data: Partial<CrmProspect>) => Promise<void>
}

// Outcome button styling with icons
const OUTCOME_BUTTONS: Array<{
  value: NonNullable<CrmProspect["call_outcome"]>
  label: string
  icon: typeof Phone
  className: string
}> = [
  {
    value: "answered",
    label: "Answered",
    icon: Phone,
    className:
      "border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:border-green-700 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900",
  },
  {
    value: "no_answer",
    label: "No Answer",
    icon: PhoneOff,
    className:
      "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-700 dark:bg-yellow-950 dark:text-yellow-300 dark:hover:bg-yellow-900",
  },
  {
    value: "voicemail",
    label: "Voicemail",
    icon: Mail,
    className:
      "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900",
  },
  {
    value: "callback",
    label: "Callback",
    icon: Phone,
    className:
      "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900",
  },
  {
    value: "not_interested",
    label: "Not Interested",
    icon: PhoneOff,
    className:
      "border-red-300 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900",
  },
]

export function CallQueue({ prospects, isLoading, onUpdate }: CallQueueProps) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [saving, setSaving] = useState(false)
  const [showCallbackDialog, setShowCallbackDialog] = useState(false)
  const [callbackDate, setCallbackDate] = useState("")
  const [callbackProspectId, setCallbackProspectId] = useState<string | null>(null)

  // Queue: uncalled first (no call_outcome), then oldest first
  const queue = useMemo(() => {
    const uncalled = prospects
      .filter((p) => !p.call_outcome)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    return uncalled
  }, [prospects])

  const current = queue[currentIdx] ?? null
  const totalInQueue = queue.length
  const progress = totalInQueue > 0 ? currentIdx + 1 : 0

  async function handleOutcome(outcome: NonNullable<CrmProspect["call_outcome"]>) {
    if (!current) return

    // If callback, show the follow-up date picker first
    if (outcome === "callback") {
      setCallbackProspectId(current.id)
      setCallbackDate("")
      setShowCallbackDialog(true)
      return
    }

    setSaving(true)
    try {
      await onUpdate(current.id, {
        call_outcome: outcome,
        last_called_at: new Date().toISOString(),
      })
      advance()
    } finally {
      setSaving(false)
    }
  }

  async function handleCallbackConfirm() {
    if (!callbackProspectId) return

    setSaving(true)
    try {
      await onUpdate(callbackProspectId, {
        call_outcome: "callback",
        last_called_at: new Date().toISOString(),
        follow_up_at: callbackDate
          ? new Date(callbackDate).toISOString()
          : undefined,
      } as Partial<CrmProspect>)
      setShowCallbackDialog(false)
      setCallbackProspectId(null)
      advance()
    } finally {
      setSaving(false)
    }
  }

  function advance() {
    // The current prospect should now have an outcome and will be filtered
    // out of the queue on the next render. The index stays the same to show
    // the next prospect in line. But if we're at the end, don't go past.
    // Since the queue recalculates reactively, we keep currentIdx as-is.
    // If currentIdx would exceed the new length, it naturally wraps.
    // We just need to make sure we don't increment past the queue end.
  }

  function handleSkip() {
    if (currentIdx < totalInQueue - 1) {
      setCurrentIdx((prev) => prev + 1)
    }
  }

  // Clamp index if queue shrinks
  useEffect(() => {
    if (totalInQueue === 0) return
    const safeIdx = Math.min(currentIdx, totalInQueue - 1)
    if (safeIdx !== currentIdx) {
      setCurrentIdx(safeIdx)
    }
  }, [currentIdx, totalInQueue])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading call queue...</p>
      </div>
    )
  }

  if (totalInQueue === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CheckCircle2 className="size-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-lg font-medium">Queue empty!</p>
          <p className="mt-1 text-sm text-muted-foreground">
            All prospects have been called. Upload more or check the Follow-ups tab.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${((prospects.length - totalInQueue) / Math.max(1, prospects.length)) * 100}%`,
              }}
            />
          </div>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">
          Calling {progress} of {totalInQueue}
        </span>
      </div>

      {/* Current prospect card */}
      {current && (
        <div className="mx-auto max-w-lg">
          <div className="rounded-xl border bg-card p-6 shadow-sm sm:p-8">
            {/* Name */}
            <h2 className="text-center text-2xl font-bold sm:text-3xl">
              {current.name}
            </h2>

            {/* Phone - large and clickable */}
            {current.phone ? (
              <button
                onClick={() => handleCall(current.phone!)}
                className="mt-4 flex items-center justify-center gap-2 text-xl font-semibold text-primary hover:underline sm:text-2xl"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                <Phone className="size-5 sm:size-6" />
                {formatPhone(current.phone)}
              </button>
            ) : (
              <p className="mt-4 text-center text-lg text-muted-foreground">
                No phone number
              </p>
            )}

            {/* Details */}
            <div className="mt-6 space-y-3">
              {current.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{current.email}</span>
                </div>
              )}
              {current.notes && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <StickyNote className="mt-0.5 size-4 shrink-0" />
                  <span>{current.notes}</span>
                </div>
              )}
              {current.call_outcome && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Previous:</span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      CALL_OUTCOME_CONFIG[current.call_outcome]?.color ??
                        "bg-gray-100 text-gray-800"
                    )}
                  >
                    {CALL_OUTCOME_CONFIG[current.call_outcome]?.label ??
                      current.call_outcome}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Outcome buttons */}
          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {OUTCOME_BUTTONS.map((btn) => (
              <button
                key={btn.value}
                onClick={() => handleOutcome(btn.value)}
                disabled={saving}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-50",
                  btn.className
                )}
              >
                <btn.icon className="size-3.5" />
                {btn.label}
              </button>
            ))}
            <button
              onClick={handleSkip}
              disabled={saving || currentIdx >= totalInQueue - 1}
              className="flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
            >
              <SkipForward className="size-3.5" />
              Skip
            </button>
          </div>
        </div>
      )}

      {/* Callback follow-up dialog */}
      <Dialog open={showCallbackDialog} onOpenChange={setShowCallbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Callback</DialogTitle>
            <DialogDescription>
              When should you call this prospect back?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Follow-up Date & Time</Label>
            <Input
              type="datetime-local"
              value={callbackDate}
              onChange={(e) => setCallbackDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCallbackDialog(false)
                setCallbackProspectId(null)
              }}
            >
              Skip Date
            </Button>
            <Button onClick={handleCallbackConfirm} disabled={saving}>
              Save Callback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
