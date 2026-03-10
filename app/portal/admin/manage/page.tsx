"use client"

import { use, Suspense, useState, useEffect, useCallback, useMemo } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  Users,
  MessageSquare,
  CalendarCheck,
  CreditCard,
  Building2,
  Clock,
  Phone,
  PhoneCall,
  CalendarDays,
  TrendingUp,
  Activity,
} from "lucide-react"
import type { DialerLead } from "@/lib/dialer/types"

// ── Types ────────────────────────────────────────────────────────────────────

interface ClientSummary {
  id: string
  legal_business_name: string
  first_name: string
  last_name: string
  onboarding_status: string
  pipeline_stage: string
  created_at: string
}

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  source: string
  created_at: string
}

interface Conversation {
  id: string
  lead_name: string
  direction: string
  last_message: string
  updated_at: string
}

interface Appointment {
  id: string
  lead_name: string
  scheduled_at: string
  status: string
}

interface Payment {
  id: string
  amount_cents: number
  status: string
  created_at: string
  description: string
}

interface DialerLeadsResponse {
  leads: DialerLead[]
  total: number
}

interface StatsResponse {
  today: {
    dials: number
    contacts: number
    conversations: number
    demos: number
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDemoDate(dateStr: string | null): { label: string; isPast: boolean; isSoon: boolean } {
  if (!dateStr) return { label: "No date set", isPast: false, isSoon: false }
  const d = new Date(dateStr)
  const now = new Date()
  const isPast = d < now
  const diffMs = d.getTime() - now.getTime()
  const isSoon = !isPast && diffMs < 24 * 60 * 60 * 1000
  const label = d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  return { label, isPast, isSoon }
}

const OUTCOME_COLORS: Record<string, string> = {
  demo_booked: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  conversation: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  callback: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  voicemail: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  no_answer: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  gatekeeper: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  not_interested: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  wrong_number: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
}

const OUTCOME_LABELS: Record<string, string> = {
  demo_booked: "Demo Booked",
  conversation: "Conversation",
  callback: "Callback",
  voicemail: "Voicemail",
  no_answer: "No Answer",
  gatekeeper: "Gatekeeper",
  not_interested: "Not Interested",
  wrong_number: "Wrong Number",
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Cold Call Summary Bar ─────────────────────────────────────────────────────

function ColdCallStatsBar() {
  const { data, isLoading } = useSWR<StatsResponse>(
    "/api/portal/dialer/stats?days=1",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 }
  )

  const stats = data?.today

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Activity className="size-4" />
        Today
      </div>
      <div className="h-4 w-px bg-border" />
      {isLoading ? (
        <>
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-20" />
        </>
      ) : (
        <>
          <StatBadge label="Dials" value={stats?.dials ?? 0} color="bg-muted text-foreground" />
          <StatBadge label="Contacts" value={stats?.contacts ?? 0} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
          <StatBadge label="Conversations" value={stats?.conversations ?? 0} color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" />
          <StatBadge label="Demos" value={stats?.demos ?? 0} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
        </>
      )}
    </div>
  )
}

function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
      <span className="font-bold">{value}</span>
      <span className="opacity-75">{label}</span>
    </span>
  )
}

// ── Upcoming Demos Card ───────────────────────────────────────────────────────

function UpcomingDemosCard() {
  const { data, isLoading } = useSWR<DialerLeadsResponse>(
    "/api/portal/dialer/leads?demo_booked=true&limit=50&sort=last_called_at&order=desc",
    fetcher,
    { revalidateOnFocus: true, refreshInterval: 30000 }
  )

  const demos = useMemo(() => {
    const leads = data?.leads ?? []
    return [...leads].sort((a, b) => {
      // Upcoming first, then past
      const aDate = a.demo_date ? new Date(a.demo_date).getTime() : 0
      const bDate = b.demo_date ? new Date(b.demo_date).getTime() : 0
      const now = Date.now()
      const aFuture = aDate > now
      const bFuture = bDate > now
      if (aFuture && !bFuture) return -1
      if (!aFuture && bFuture) return 1
      if (aFuture && bFuture) return aDate - bDate
      return bDate - aDate
    })
  }, [data])

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <CalendarDays className="size-4 text-green-600" />
        <h2 className="font-semibold">Upcoming Demos</h2>
        {demos.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {demos.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : demos.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CalendarDays className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No demos booked yet</p>
          <p className="text-xs text-muted-foreground">
            Demos booked via Cold Calls will appear here
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {demos.map((lead) => {
            const { label, isPast, isSoon } = formatDemoDate(lead.demo_date)
            return (
              <div key={lead.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {lead.business_name || "Unknown Business"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lead.owner_name || lead.first_name || "—"}
                    {lead.state ? ` · ${lead.state}` : ""}
                  </p>
                  {lead.phone_number && (
                    <a
                      href={`tel:${lead.phone_number}`}
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Phone className="size-3" />
                      {lead.phone_number}
                    </a>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      isPast
                        ? "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        : isSoon
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    }`}
                  >
                    {isPast ? "Past due" : isSoon ? "Soon" : "Upcoming"}
                  </span>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Recent Cold Call Activity Card ────────────────────────────────────────────

function RecentActivityCard() {
  const { data, isLoading } = useSWR<DialerLeadsResponse>(
    "/api/portal/dialer/leads?limit=10&sort=last_called_at&order=desc",
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 60000 }
  )

  const recent = useMemo(
    () => (data?.leads ?? []).filter((l) => l.last_called_at),
    [data]
  )

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <PhoneCall className="size-4 text-blue-600" />
        <h2 className="font-semibold">Recent Cold Call Activity</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <PhoneCall className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No calls yet today</p>
        </div>
      ) : (
        <div className="divide-y">
          {recent.map((lead) => {
            const outcome = lead.last_outcome
            const colorClass = outcome ? (OUTCOME_COLORS[outcome] ?? "bg-gray-100 text-gray-600") : "bg-gray-100 text-gray-600"
            const outcomeLabel = outcome ? (OUTCOME_LABELS[outcome] ?? outcome) : "Unknown"
            return (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {lead.business_name || "Unknown Business"}
                  </p>
                  {lead.notes && (
                    <p className="line-clamp-1 text-xs text-muted-foreground">{lead.notes}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
                    {outcomeLabel}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3" />
                    {timeAgo(lead.last_called_at)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main ManageContent ────────────────────────────────────────────────────────

function ManageContent() {
  const { user } = use(PortalAuthContext)
  if (!user || user.role !== "admin") redirect("/portal/dashboard")

  const [clients, setClients] = useState<ClientSummary[]>([])
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientSummary | null>(null)
  const [loading, setLoading] = useState(true)

  // Client data
  const [leads, setLeads] = useState<Lead[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  // Fetch clients
  useEffect(() => {
    async function fetchClients() {
      const res = await fetch("/api/portal/admin")
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
      setLoading(false)
    }
    fetchClients()
  }, [])

  // Fetch client data when selected
  const fetchClientData = useCallback(async (clientId: string) => {
    setDataLoading(true)
    const [leadsRes, convRes, apptRes, payRes] = await Promise.all([
      fetch(`/api/portal/leads?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/conversations?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/appointments?client_id=${clientId}`).catch(() => null),
      fetch(`/api/portal/payments?client_id=${clientId}`).catch(() => null),
    ])
    if (leadsRes?.ok) setLeads(await leadsRes.json().then((d) => d.leads || d || []))
    else setLeads([])
    if (convRes?.ok) setConversations(await convRes.json().then((d) => d.conversations || d || []))
    else setConversations([])
    if (apptRes?.ok) setAppointments(await apptRes.json().then((d) => d.appointments || d || []))
    else setAppointments([])
    if (payRes?.ok) setPayments(await payRes.json().then((d) => d.payments || d || []))
    else setPayments([])
    setDataLoading(false)
  }, [])

  function handleSelectClient(client: ClientSummary) {
    setSelectedClient(client)
    fetchClientData(client.id)
  }

  // Filter clients by search
  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        c.legal_business_name?.toLowerCase().includes(q) ||
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q)
    )
  }, [clients, search])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Manage</h1>
        <p className="text-sm text-muted-foreground">
          Cold call activity, demos, and client details
        </p>
      </div>

      {/* Cold Call Stats Bar */}
      <ColdCallStatsBar />

      {/* Cold Call sections — two column on wider screens */}
      <div className="grid gap-4 lg:grid-cols-2">
        <UpcomingDemosCard />
        <RecentActivityCard />
      </div>

      <div className="border-t pt-4">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-muted-foreground" />
          <h2 className="font-semibold">Client Management</h2>
        </div>

        {/* Client Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            aria-label="Search clients by name"
          />
        </div>

        {/* Client List (shows when searching or no client selected) */}
        {!selectedClient && (
          <div className="grid gap-2">
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center">
                <Building2 className="mx-auto mb-2 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {search ? "No clients match your search" : "No clients yet"}
                </p>
              </div>
            ) : (
              filtered.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => handleSelectClient(client)}
                  className="flex items-center justify-between rounded-lg border bg-card p-4 text-left transition-colors hover:bg-accent"
                >
                  <div>
                    <p className="font-medium">{client.legal_business_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {client.first_name} {client.last_name}
                    </p>
                  </div>
                  <Badge variant="outline">{client.pipeline_stage || client.onboarding_status}</Badge>
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected Client View */}
        {selectedClient && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="text-sm text-muted-foreground hover:text-foreground"
                  aria-label="Back to client list"
                >
                  &larr; All Clients
                </button>
                <span className="text-muted-foreground">/</span>
                <h2 className="font-semibold">{selectedClient.legal_business_name}</h2>
              </div>
              <Badge variant="outline">
                {selectedClient.pipeline_stage || selectedClient.onboarding_status}
              </Badge>
            </div>

            <Tabs defaultValue="leads">
              <TabsList>
                <TabsTrigger value="leads" className="gap-1.5">
                  <Users className="size-3.5" />
                  Leads
                  {leads.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {leads.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="conversations" className="gap-1.5">
                  <MessageSquare className="size-3.5" />
                  Conversations
                  {conversations.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {conversations.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="appointments" className="gap-1.5">
                  <CalendarCheck className="size-3.5" />
                  Appointments
                  {appointments.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {appointments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="billing" className="gap-1.5">
                  <CreditCard className="size-3.5" />
                  Billing
                  {payments.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                      {payments.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {dataLoading ? (
                <div className="mt-4 space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : (
                <>
                  <TabsContent value="leads">
                    {leads.length === 0 ? (
                      <EmptyTab icon={Users} label="No leads yet" />
                    ) : (
                      <div className="space-y-2">
                        {leads.map((lead) => (
                          <div
                            key={lead.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{lead.name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground">{lead.phone}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{lead.status}</Badge>
                              <span className="text-xs text-muted-foreground">{lead.source}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="conversations">
                    {conversations.length === 0 ? (
                      <EmptyTab icon={MessageSquare} label="No conversations yet" />
                    ) : (
                      <div className="space-y-2">
                        {conversations.map((conv) => (
                          <div
                            key={conv.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{conv.lead_name || "Unknown"}</p>
                              <p className="text-sm text-muted-foreground line-clamp-1">
                                {conv.last_message}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="size-3" />
                              {new Date(conv.updated_at).toLocaleDateString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="appointments">
                    {appointments.length === 0 ? (
                      <EmptyTab icon={CalendarCheck} label="No appointments yet" />
                    ) : (
                      <div className="space-y-2">
                        {appointments.map((appt) => (
                          <div
                            key={appt.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">{appt.lead_name || "Appointment"}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(appt.scheduled_at).toLocaleString()}
                              </p>
                            </div>
                            <Badge variant={appt.status === "showed" ? "default" : "outline"}>
                              {appt.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="billing">
                    {payments.length === 0 ? (
                      <EmptyTab icon={CreditCard} label="No payments yet" />
                    ) : (
                      <div className="space-y-2">
                        {payments.map((payment) => (
                          <div
                            key={payment.id}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="font-medium">
                                ${((payment.amount_cents || 0) / 100).toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {payment.description || "Payment"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={payment.status === "succeeded" ? "default" : "outline"}
                              >
                                {payment.status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(payment.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyTab({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <Icon className="mx-auto mb-2 size-8 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

export default function ManagePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ManageContent />
    </Suspense>
  )
}
