"use client"

import { useState, useCallback } from "react"
import useSWR from "swr"
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Phone,
  Mail,
  Globe,
  MapPin,
  Wrench,
  Calendar,
  User,
  Clock,
  PhoneCall,
  PhoneMissed,
  PhoneOff,
  StickyNote,
  Loader2,
  CalendarDays,
  ChevronDown,
  ExternalLink,
  ArrowRightLeft,
  MessageSquare,
  CheckCircle2,
  UserPlus,
  CalendarCheck,
  DollarSign,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

// ─── Inline utilities (no external lib/portal deps) ─────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
}

function formatPhone(phone: string): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  if (digits.length === 11) return `+${digits[0]} (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  return phone
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function handleCall(phone: string) {
  window.open(`tel:${phone}`)
}

// ─── Pipeline config ─────────────────────────────────────────────────────────

type ClientPipelineStage = string

const CLIENT_PIPELINE_STAGES: string[] = [
  "contacted",
  "interested",
  "demo_scheduled",
  "demo",
  "onboarding",
  "setup",
  "launch",
  "active",
  "onboarded",
  "signed",
  "churned",
]

const CLIENT_PIPELINE_CONFIG: Record<string, { label: string; color: string }> = {
  contacted: { label: "Contacted", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  interested: { label: "Interested", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300" },
  demo_scheduled: { label: "Demo Scheduled", color: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300" },
  demo: { label: "Demo", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" },
  onboarding: { label: "Onboarding", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300" },
  setup: { label: "Setup", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300" },
  launch: { label: "Launch", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300" },
  active: { label: "Active", color: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300" },
  onboarded: { label: "Onboarded", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300" },
  signed: { label: "Signed", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" },
  churned: { label: "Churned", color: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300" },
}

// ─── Types ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClientDetail = Record<string, any>

interface ClientActivity {
  id: string
  type: string
  title: string
  detail: string | null
  created_at: string
}

interface ClientDetailPanelProps {
  clientId: string
  onBack: () => void
}

interface ClientDetailResponse {
  client: ClientDetail
  metrics: {
    lead_count: number
    appointment_count: number
    show_rate: number
    total_charged: number
  }
  tasks: Array<{
    id: string
    title: string
    completed: boolean
    due_at: string | null
  }>
  recentActivity: ClientActivity[]
}

interface DialerLeadRow {
  id: string
  business_name: string
  phone_number: string
  attempt_count: number
  last_called_at: string | null
  last_outcome: string | null
  notes: string | null
}

interface DialerLeadsResponse {
  leads: DialerLeadRow[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Maps the prompt's pipeline stages (contacted/interested/…) onto the actual
// ClientPipelineStage values used in the DB. The prompt uses a different set,
// so we expose the real stages from constants but also add the display-only
// "contacted" / "interested" vocabulary via a unified lookup below.
const STAGE_COLORS: Record<string, string> = {
  // Real DB stages (CLIENT_PIPELINE_STAGES)
  demo: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300",
  onboarding: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300",
  setup: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/60 dark:text-yellow-300",
  launch: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300",
  active: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300",
  // Prompt-requested aliases (in case they appear)
  contacted: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  interested: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300",
  demo_scheduled: "bg-green-100 text-green-800 dark:bg-green-900/60 dark:text-green-300",
  onboarded: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300",
  signed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300",
  churned: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-300",
}

const CALL_OUTCOME_ICONS: Record<string, typeof PhoneCall> = {
  conversation: PhoneCall,
  demo_booked: CalendarCheck,
  no_answer: PhoneMissed,
  voicemail: PhoneOff,
  not_interested: PhoneOff,
  gatekeeper: PhoneCall,
  callback: PhoneCall,
  wrong_number: PhoneOff,
}

const ACTIVITY_ICON_MAP: Record<
  ClientActivity["type"],
  { icon: typeof ArrowRightLeft; color: string }
> = {
  stage_change: { icon: ArrowRightLeft, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/50" },
  slack_message: { icon: MessageSquare, color: "text-purple-500 bg-purple-100 dark:bg-purple-900/50" },
  email_sent: { icon: Mail, color: "text-green-500 bg-green-100 dark:bg-green-900/50" },
  call: { icon: Phone, color: "text-orange-500 bg-orange-100 dark:bg-orange-900/50" },
  task_completed: { icon: CheckCircle2, color: "text-emerald-500 bg-emerald-100 dark:bg-emerald-900/50" },
  note: { icon: StickyNote, color: "text-zinc-500 bg-zinc-100 dark:bg-zinc-800" },
  lead_in: { icon: UserPlus, color: "text-blue-500 bg-blue-100 dark:bg-blue-900/50" },
  appointment: { icon: CalendarCheck, color: "text-indigo-500 bg-indigo-100 dark:bg-indigo-900/50" },
  payment: { icon: DollarSign, color: "text-green-500 bg-green-100 dark:bg-green-900/50" },
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchClientDetail(url: string): Promise<ClientDetailResponse> {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch client")
  return res.json()
}

async function fetchDialerLeads(url: string): Promise<DialerLeadsResponse> {
  const res = await fetch(url)
  if (!res.ok) return { leads: [] }
  return res.json()
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-3.5 w-20" />
      <Skeleton className="h-5 w-40" />
    </div>
  )
}

interface EditableFieldProps {
  label: string
  value: string | null | undefined
  fieldKey: string
  editingField: string | null
  editValue: string
  saving: boolean
  icon?: React.ReactNode
  onEditStart: (key: string, current: string) => void
  onEditChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
  renderValue?: (val: string) => React.ReactNode
  inputType?: string
  readOnly?: boolean
}

function EditableField({
  label,
  value,
  fieldKey,
  editingField,
  editValue,
  saving,
  icon,
  onEditStart,
  onEditChange,
  onSave,
  onCancel,
  renderValue,
  inputType = "text",
  readOnly = false,
}: EditableFieldProps) {
  const isEditing = editingField === fieldKey
  const displayValue = value || "—"

  return (
    <div className="group relative">
      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>

      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Input
            value={editValue}
            onChange={(e) => onEditChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSave()
              if (e.key === "Escape") onCancel()
            }}
            type={inputType}
            className="h-7 text-sm"
            autoFocus
            disabled={saving}
          />
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-emerald-600 hover:text-emerald-700"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium">
            {renderValue ? renderValue(displayValue) : displayValue}
          </span>
          {!readOnly && (
            <Button
              size="icon"
              variant="ghost"
              className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => onEditStart(fieldKey, value || "")}
            >
              <Pencil className="size-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

interface StageSelectFieldProps {
  value: ClientPipelineStage
  editingField: string | null
  saving: boolean
  onEditStart: (key: string, current: string) => void
  onSelectChange: (val: string) => void
  onSave: () => void
  onCancel: () => void
}

function StageSelectField({
  value,
  editingField,
  saving,
  onEditStart,
  onSelectChange,
  onSave,
  onCancel,
}: StageSelectFieldProps) {
  const isEditing = editingField === "pipeline_stage"
  const config = CLIENT_PIPELINE_CONFIG[value] ?? { label: value, color: "" }

  return (
    <div className="group relative">
      <p className="mb-0.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <ChevronDown className="size-3" />
        Pipeline Stage
      </p>

      {isEditing ? (
        <div className="flex items-center gap-1.5">
          <Select onValueChange={onSelectChange} defaultValue={value}>
            <SelectTrigger className="h-7 w-44 text-sm" size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_PIPELINE_STAGES.map((stage) => (
                <SelectItem key={stage} value={stage}>
                  {CLIENT_PIPELINE_CONFIG[stage]?.label ?? stage}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-emerald-600 hover:text-emerald-700"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 shrink-0 text-muted-foreground"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5">
          <Badge className={cn("text-xs", STAGE_COLORS[value])}>{config.label}</Badge>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => onEditStart("pipeline_stage", value)}
          >
            <Pencil className="size-3" />
          </Button>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientDetailPanel({ clientId, onBack }: ClientDetailPanelProps) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [saving, setSaving] = useState(false)
  const [schedulingDemo, setSchedulingDemo] = useState(false)
  const [demoDateInput, setDemoDateInput] = useState("")
  const [savingDemo, setSavingDemo] = useState(false)

  // ── Data fetching ────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    mutate,
  } = useSWR<ClientDetailResponse>(
    `client-detail-${clientId}`,
    () => fetchClientDetail(`/api/portal/admin/clients/${clientId}`),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const client = data?.client
  const metrics = data?.metrics
  const recentActivity = data?.recentActivity ?? []

  // Fetch dialer lead by phone after we have the client
  const {
    data: dialerData,
  } = useSWR<DialerLeadsResponse>(
    client?.business_phone
      ? `dialer-lead-${client.business_phone}`
      : null,
    () =>
      fetchDialerLeads(
        `/api/portal/dialer/leads?search=${encodeURIComponent(client!.business_phone)}`
      ),
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const dialerLead: DialerLeadRow | null = dialerData?.leads?.[0] ?? null

  // ── Inline edit handlers ─────────────────────────────────────────────────
  const handleEditStart = useCallback((key: string, current: string) => {
    setEditingField(key)
    setEditValue(current)
  }, [])

  const handleEditCancel = useCallback(() => {
    setEditingField(null)
    setEditValue("")
  }, [])

  const handleSave = useCallback(async () => {
    if (!editingField || !client) return
    setSaving(true)
    try {
      // Special case: contact_name splits into first_name + last_name
      let body: Record<string, string>
      if (editingField === "contact_name") {
        const parts = editValue.trim().split(/\s+/)
        body = { first_name: parts[0] || "", last_name: parts.slice(1).join(" ") || "" }
      } else {
        body = { [editingField]: editValue }
      }
      const res = await fetch(`/api/portal/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Save failed")
      await mutate()
      setEditingField(null)
      setEditValue("")
    } catch {
      // field stays open so user can retry
    } finally {
      setSaving(false)
    }
  }, [editingField, editValue, client, clientId, mutate])

  // Stage select fires onChange before the save button — track value in editValue
  const handleSelectChange = useCallback((val: string) => {
    setEditValue(val)
  }, [])

  // ── Demo scheduling ──────────────────────────────────────────────────────
  async function handleScheduleDemo() {
    if (!demoDateInput) return
    setSavingDemo(true)
    try {
      const res = await fetch(`/api/portal/admin/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo_call_at: new Date(demoDateInput).toISOString() }),
      })
      if (!res.ok) throw new Error("Failed to schedule demo")
      await mutate()
      setSchedulingDemo(false)
      setDemoDateInput("")
    } catch {
      // silent
    } finally {
      setSavingDemo(false)
    }
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Info grid skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity skeleton */}
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-8 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex h-48 items-center justify-center text-muted-foreground">
        Client not found.
      </div>
    )
  }

  const pipelineConfig = CLIENT_PIPELINE_CONFIG[client.pipeline_stage]

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="mt-0.5 size-8 shrink-0"
          onClick={onBack}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Back to list</span>
        </Button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold leading-tight">
              {client.legal_business_name}
            </h1>
            <Badge className={cn("shrink-0 text-xs", STAGE_COLORS[client.pipeline_stage])}>
              {pipelineConfig?.label ?? client.pipeline_stage}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {[client.first_name, client.last_name].filter(Boolean).join(" ")}
            {client.service_type && (
              <>
                {" · "}
                <span className="capitalize">{client.service_type}</span>
              </>
            )}
          </p>
        </div>

        {/* Quick action phone link */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => handleCall(client.business_phone)}
        >
          <Phone className="mr-1.5 size-3.5" />
          Call
        </Button>
      </div>

      {/* ── Metrics strip ── */}
      {metrics && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Leads", value: metrics.lead_count },
            { label: "Appointments", value: metrics.appointment_count },
            { label: "Show Rate", value: `${Math.round(metrics.show_rate)}%` },
            {
              label: "Charged",
              value: new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              }).format(metrics.total_charged),
            },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg border bg-card px-3 py-2.5 text-center"
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Info Grid ── */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Client Info
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Contact Name — edits first_name + last_name together */}
            <EditableField
              label="Contact Name"
              value={[client.first_name, client.last_name].filter(Boolean).join(" ")}
              fieldKey="contact_name"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<User className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
            />

            {/* Phone */}
            <EditableField
              label="Phone"
              value={client.business_phone}
              fieldKey="business_phone"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Phone className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              renderValue={(v) => (
                <a
                  href={`tel:${v}`}
                  className="hover:text-primary hover:underline"
                  onClick={(e) => {
                    e.preventDefault()
                    handleCall(v)
                  }}
                >
                  {formatPhone(v)}
                </a>
              )}
            />

            {/* Email */}
            <EditableField
              label="Email"
              value={client.email_for_notifications || client.business_email_for_leads}
              fieldKey="email_for_notifications"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Mail className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              inputType="email"
              renderValue={(v) =>
                v !== "—" ? (
                  <a
                    href={`mailto:${v}`}
                    className="hover:text-primary hover:underline"
                  >
                    {v}
                  </a>
                ) : (
                  <span>—</span>
                )
              }
            />

            {/* State */}
            <EditableField
              label="State"
              value={client.state}
              fieldKey="state"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<MapPin className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
            />

            {/* Website */}
            <EditableField
              label="Website"
              value={client.website_url}
              fieldKey="website_url"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Globe className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              renderValue={(v) =>
                v !== "—" ? (
                  <a
                    href={v.startsWith("http") ? v : `https://${v}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:text-primary hover:underline"
                  >
                    {v}
                    <ExternalLink className="size-3" />
                  </a>
                ) : (
                  <span>—</span>
                )
              }
            />

            {/* Service Type */}
            <EditableField
              label="Service Type"
              value={client.service_type}
              fieldKey="service_type"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Wrench className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              renderValue={(v) => (
                <span className="capitalize">{v}</span>
              )}
            />

            {/* Pipeline Stage (dropdown) */}
            <StageSelectField
              value={client.pipeline_stage}
              editingField={editingField}
              saving={saving}
              onEditStart={handleEditStart}
              onSelectChange={handleSelectChange}
              onSave={handleSave}
              onCancel={handleEditCancel}
            />

            {/* Demo Call */}
            <EditableField
              label="Demo Call"
              value={client.demo_call_at ? formatDateTime(client.demo_call_at) : null}
              fieldKey="demo_call_at"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Calendar className="size-3" />}
              onEditStart={(key) => {
                // Use the raw ISO value for datetime-local input
                const iso = client.demo_call_at
                  ? new Date(client.demo_call_at).toISOString().slice(0, 16)
                  : ""
                handleEditStart(key, iso)
              }}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              inputType="datetime-local"
            />

            {/* Onboarding Status */}
            <EditableField
              label="Onboarding Status"
              value={client.onboarding_status}
              fieldKey="onboarding_status"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<CheckCircle2 className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              renderValue={(v) =>
                v !== "—" ? (
                  <Badge
                    variant="outline"
                    className="text-xs capitalize"
                  >
                    {v}
                  </Badge>
                ) : (
                  <span>—</span>
                )
              }
            />

            {/* Created (read-only) */}
            <EditableField
              label="Created"
              value={formatDate(client.created_at)}
              fieldKey="created_at"
              editingField={editingField}
              editValue={editValue}
              saving={saving}
              icon={<Clock className="size-3" />}
              onEditStart={handleEditStart}
              onEditChange={setEditValue}
              onSave={handleSave}
              onCancel={handleEditCancel}
              readOnly
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Call History (from dialer) ── */}
      {dialerLead && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Cold Call History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <PhoneCall className="size-4 text-muted-foreground" />
                <span className="font-medium">{dialerLead.attempt_count}</span>
                <span className="text-muted-foreground">
                  {dialerLead.attempt_count === 1 ? "attempt" : "attempts"}
                </span>
              </div>

              {dialerLead.last_called_at && (
                <div className="flex items-center gap-1.5">
                  <Clock className="size-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Last called {getRelativeTime(dialerLead.last_called_at)}
                  </span>
                </div>
              )}

              {dialerLead.last_outcome && (() => {
                const Icon = CALL_OUTCOME_ICONS[dialerLead.last_outcome] ?? PhoneCall
                return (
                  <div className="flex items-center gap-1.5">
                    <Icon className="size-4 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs capitalize">
                      {dialerLead.last_outcome.replace(/_/g, " ")}
                    </Badge>
                  </div>
                )
              })()}
            </div>

            {dialerLead.notes && (
              <div className="rounded-md bg-muted/40 p-3">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <StickyNote className="size-3" />
                  Dialer Notes
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {dialerLead.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Activity Timeline ── */}
      {recentActivity.length > 0 && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-0">
              {/* Connecting line */}
              <div className="absolute bottom-2 left-[15px] top-2 w-px bg-border" />

              {recentActivity.map((activity) => {
                const config = ACTIVITY_ICON_MAP[activity.type]
                const Icon = config?.icon ?? StickyNote
                const colorClass =
                  config?.color ?? "text-zinc-500 bg-zinc-100 dark:bg-zinc-800"

                return (
                  <div
                    key={activity.id}
                    className="relative flex gap-3 pb-5 last:pb-0"
                  >
                    {/* Icon dot */}
                    <div
                      className={cn(
                        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full",
                        colorClass
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <p className="text-sm font-medium leading-tight">
                        {activity.title}
                      </p>
                      {activity.detail && (
                        <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                          {activity.detail}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground/60">
                        {getRelativeTime(activity.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Quick Actions ── */}
      <Card>
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Schedule Demo */}
          <div>
            {schedulingDemo ? (
              <div className="flex items-center gap-2">
                <Input
                  type="datetime-local"
                  value={demoDateInput}
                  onChange={(e) => setDemoDateInput(e.target.value)}
                  className="h-8 text-sm"
                  disabled={savingDemo}
                />
                <Button
                  size="sm"
                  onClick={handleScheduleDemo}
                  disabled={savingDemo || !demoDateInput}
                  className="shrink-0"
                >
                  {savingDemo ? (
                    <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 size-3.5" />
                  )}
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSchedulingDemo(false)
                    setDemoDateInput("")
                  }}
                  disabled={savingDemo}
                  className="shrink-0"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSchedulingDemo(true)}
              >
                <CalendarDays className="mr-1.5 size-3.5" />
                Schedule Demo
              </Button>
            )}
          </div>

          <Separator />

          <div className="flex flex-wrap gap-2">
            {/* Change Stage dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Change stage:</span>
              <Select
                value={client.pipeline_stage}
                onValueChange={async (val) => {
                  const res = await fetch(`/api/portal/admin/clients/${clientId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ pipeline_stage: val }),
                  })
                  if (res.ok) mutate()
                }}
              >
                <SelectTrigger className="h-8 w-40 text-sm" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_PIPELINE_STAGES.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {CLIENT_PIPELINE_CONFIG[stage]?.label ?? stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone */}
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={`tel:${client.business_phone}`}>
                <Phone className="mr-1.5 size-3.5" />
                {formatPhone(client.business_phone)}
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
