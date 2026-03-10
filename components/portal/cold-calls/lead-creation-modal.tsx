"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import type { DialerLead } from "@/lib/dialer/types"
import {
  Calendar,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  CalendarCheck,
  MessageSquare,
  Clock,
  Mail,
  Phone,
  Globe,
  MapPin,
  User,
  Building2,
} from "lucide-react"

// ─── Props ────────────────────────────────────────────────────────────────────

interface LeadCreationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  lead: DialerLead | null
  outcome: "demo_booked" | "conversation" | "callback"
  onComplete: (data: { demoDate: string; email: string; notes: string }) => void
}

// ─── Outcome config ───────────────────────────────────────────────────────────

const OUTCOME_CONFIG = {
  demo_booked: {
    label: "Demo Booked",
    icon: CalendarCheck,
    accent: "border-green-500/60",
    headerBg: "bg-green-500/10",
    headerText: "text-green-400",
    badgeBg: "bg-green-500/20 text-green-300 border-green-500/30",
    buttonClass: "bg-green-600 hover:bg-green-700 text-white",
  },
  conversation: {
    label: "Conversation",
    icon: MessageSquare,
    accent: "border-blue-500/60",
    headerBg: "bg-blue-500/10",
    headerText: "text-blue-400",
    badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
  },
  callback: {
    label: "Callback Scheduled",
    icon: Clock,
    accent: "border-purple-500/60",
    headerBg: "bg-purple-500/10",
    headerText: "text-purple-400",
    badgeBg: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    buttonClass: "bg-purple-600 hover:bg-purple-700 text-white",
  },
} as const

// ─── Google Calendar URL builder ──────────────────────────────────────────────

function buildGCalUrl(params: {
  businessName: string
  contactName: string
  email: string
  demoDate: string // datetime-local value e.g. "2026-03-15T14:00"
}): string | null {
  const { businessName, contactName, email, demoDate } = params
  if (!demoDate) return null

  try {
    const start = new Date(demoDate)
    if (isNaN(start.getTime())) return null
    const end = new Date(start.getTime() + 30 * 60 * 1000) // +30 min

    // Google Calendar format: YYYYMMDDTHHmmss (no Z suffix = local time).
    // We must NOT use .toISOString() here — it converts to UTC, which would
    // shift the event time. The datetime-local input gives us local time, so
    // we format the local components directly.
    const pad = (n: number) => n.toString().padStart(2, "0")
    const fmt = (d: Date) =>
      `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`

    const biz = encodeURIComponent(`Demo Call - ${businessName || "Lead"}`)
    const details = encodeURIComponent(
      `Demo call with ${contactName || "contact"} from ${businessName || "their company"}.`
    )
    const addParam = email ? `&add=${encodeURIComponent(email)}` : ""

    return (
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${biz}` +
      `&dates=${fmt(start)}/${fmt(end)}` +
      `&details=${details}` +
      addParam
    )
  } catch {
    return null
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadCreationModal({
  open,
  onOpenChange,
  lead,
  outcome,
  onComplete,
}: LeadCreationModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [businessName, setBusinessName] = useState("")
  const [contactName, setContactName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [state, setState] = useState("")
  const [website, setWebsite] = useState("")
  const [demoDate, setDemoDate] = useState("")
  const [notes, setNotes] = useState("")

  // ── UI state ────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [gcalUrl, setGcalUrl] = useState<string | null>(null)

  // ── Seed form when lead changes ─────────────────────────────────────────────
  useEffect(() => {
    if (!lead) return
    setBusinessName(lead.business_name ?? "")
    setContactName(lead.owner_name ?? lead.first_name ?? "")
    setPhone(lead.phone_number ?? "")
    setState(lead.state ?? "")
    setWebsite(lead.website ?? "")
    setEmail("")
    setDemoDate("")
    setNotes("")
    setGcalUrl(null)
    setCopied(false)
  }, [lead])

  // ── Rebuild GCal URL whenever relevant fields change ────────────────────────
  useEffect(() => {
    if (outcome !== "demo_booked" || !demoDate) {
      setGcalUrl(null)
      return
    }
    const url = buildGCalUrl({ businessName, contactName, email, demoDate })
    setGcalUrl(url)
  }, [businessName, contactName, email, demoDate, outcome])

  // ── Copy handler ────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!gcalUrl) return
    try {
      await navigator.clipboard.writeText(gcalUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers that block clipboard without HTTPS focus
      const el = document.createElement("textarea")
      el.value = gcalUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand("copy")
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [gcalUrl])

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setLoading(true)
    try {
      onComplete({ demoDate, email, notes })
    } finally {
      setLoading(false)
    }
  }, [demoDate, email, notes, onComplete])

  // ── Derived values ──────────────────────────────────────────────────────────
  const config = OUTCOME_CONFIG[outcome]
  const OutcomeIcon = config.icon
  const isDemo = outcome === "demo_booked"

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-lg border-2 bg-zinc-900 text-zinc-100 shadow-2xl",
          config.accent
        )}
      >
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <DialogHeader
          className={cn(
            "-mx-6 -mt-6 mb-2 rounded-t-lg px-6 pt-5 pb-4",
            config.headerBg
          )}
        >
          <DialogTitle className={cn("flex items-center gap-2 text-lg font-bold", config.headerText)}>
            <OutcomeIcon className="h-5 w-5 shrink-0" />
            {config.label}
            <span className={cn("ml-auto rounded-full border px-2 py-0.5 text-xs font-medium", config.badgeBg)}>
              New Lead
            </span>
          </DialogTitle>
          <p className="mt-0.5 text-xs text-zinc-400">
            Review and complete the lead card before submitting.
          </p>
        </DialogHeader>

        {/* ── Form ──────────────────────────────────────────────────────────── */}
        <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-1">

          {/* Row 1: Business Name */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Building2 className="h-3.5 w-3.5 text-zinc-500" />
              Business Name
            </Label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Business name"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Row 2: Contact Name + Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <User className="h-3.5 w-3.5 text-zinc-500" />
                Contact Name
              </Label>
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Owner name"
                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Phone className="h-3.5 w-3.5 text-zinc-500" />
                Phone
              </Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (704) 555-0100"
                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 3: Email (new field) */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
              <Mail className="h-3.5 w-3.5 text-zinc-500" />
              Email
              <span className="ml-1 text-[10px] text-zinc-500">(required for demo invite)</span>
            </Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@company.com"
              className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>

          {/* Row 4: State + Website */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                State
              </Label>
              <Input
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="NC"
                maxLength={2}
                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Globe className="h-3.5 w-3.5 text-zinc-500" />
                Website
              </Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="company.com"
                className="border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* Row 5: Demo Date/Time (demo_booked only) */}
          {isDemo && (
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs font-medium text-zinc-300">
                <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                Demo Date & Time
              </Label>
              <Input
                type="datetime-local"
                value={demoDate}
                onChange={(e) => setDemoDate(e.target.value)}
                className="border-zinc-700 bg-zinc-800 text-zinc-100 [color-scheme:dark]"
              />
            </div>
          )}

          {/* Row 6: Google Calendar section (demo_booked + demoDate set) */}
          {isDemo && gcalUrl && (
            <div className="rounded-lg border border-zinc-700 bg-zinc-800/60 p-3 space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
                <Calendar className="h-3.5 w-3.5 text-green-400" />
                Google Calendar Invite
              </p>
              {/* URL preview */}
              <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2">
                <p className="truncate font-mono text-[10px] text-zinc-500 select-all">
                  {gcalUrl}
                </p>
              </div>
              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  className="flex-1 border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                >
                  {copied ? (
                    <>
                      <Check className="mr-1.5 h-3.5 w-3.5 text-green-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy Link
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  asChild
                  className="flex-1 border-zinc-600 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100"
                >
                  <a href={gcalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                    Open in Google Calendar
                  </a>
                </Button>
              </div>
            </div>
          )}

          {/* Row 7: Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-300">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Key points from the call, pain points, objections, anything useful..."
              rows={3}
              className="resize-none border-zinc-700 bg-zinc-800 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
        </div>

        {/* ── Footer actions ─────────────────────────────────────────────────── */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-200"
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSubmit}
            disabled={loading}
            className={cn("min-w-[160px] font-semibold", config.buttonClass)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <OutcomeIcon className="mr-2 h-4 w-4" />
                Create Lead & Continue
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
