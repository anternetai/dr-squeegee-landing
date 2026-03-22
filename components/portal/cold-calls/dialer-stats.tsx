"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Phone,
  Users,
  MessageSquare,
  CalendarCheck,
  TrendingUp,
  RefreshCw,
} from "lucide-react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

// ─── Fetcher ───────────────────────────────────────────────────────────────────

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DailyRow {
  date: string
  dials: number
  contacts: number
  conversations: number
  demos: number
}

interface OutcomeRow {
  outcome: string
  count: number
}

interface StatusRow {
  status: string
  count: number
}

interface PeriodStats {
  dials: number
  contacts: number
  conversations: number
  demos: number
  days: number
}

interface StatsData {
  today: {
    dials: number
    contacts: number
    conversations: number
    demos: number
  }
  period: PeriodStats
  dailyBreakdown: DailyRow[]
  outcomeBreakdown: OutcomeRow[]
  leadStatusSummary: StatusRow[]
  rates: {
    contactRate: number
    conversationRate: number
    demoRate: number
  }
}

// ─── Color maps ────────────────────────────────────────────────────────────────

const OUTCOME_COLORS: Record<string, string> = {
  no_answer: "#6b7280",
  voicemail: "#94a3b8",
  gatekeeper: "#a78bfa",
  conversation: "#3b82f6",
  demo_booked: "#22c55e",
  not_interested: "#ef4444",
  wrong_number: "#f97316",
  callback: "#f59e0b",
}

const STATUS_COLORS: Record<string, string> = {
  queued: "#3b82f6",
  in_progress: "#f97316",
  callback: "#f59e0b",
  completed: "#22c55e",
  archived: "#6b7280",
}

// ─── Revenue per showed appointment ───────────────────────────────────────────

const REVENUE_PER_DEMO = 200 // $200 per showed appointment

// ─── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  rate,
  rateLabel,
  icon: Icon,
  accent,
  revenueProjection,
}: {
  label: string
  value: number
  rate?: number
  rateLabel?: string
  icon: typeof Phone
  accent: string
  revenueProjection?: boolean
}) {
  return (
    <Card className="bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className={cn("size-4", accent)} />
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-3xl font-bold tabular-nums">{value.toLocaleString()}</p>
        {rate !== undefined && rateLabel && (
          <p className={cn("text-xs font-medium", accent)}>
            {rate.toFixed(1)}% {rateLabel}
          </p>
        )}
        {revenueProjection && value > 0 && (
          <p className="text-xs font-semibold text-emerald-400">
            ${(value * REVENUE_PER_DEMO).toLocaleString()} projected
          </p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Days selector ─────────────────────────────────────────────────────────────

const DAY_OPTIONS = [7, 14, 30, 90] as const
type DayOption = (typeof DAY_OPTIONS)[number]

function DaysSelector({
  days,
  onChange,
}: {
  days: DayOption
  onChange: (d: DayOption) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border bg-muted/40 p-1">
      {DAY_OPTIONS.map((d) => (
        <button
          key={d}
          onClick={() => onChange(d)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            days === d
              ? "bg-orange-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {d}d
        </button>
      ))}
    </div>
  )
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
      <p className="mb-1 font-medium text-muted-foreground">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5">
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: p.color }}
          />
          <span className="text-foreground font-medium">{p.value.toLocaleString()}</span>
          <span className="text-muted-foreground">{p.name}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function StatsSkeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

export function DialerStats() {
  const [days, setDays] = useState<DayOption>(30)

  const { data, isLoading, error, mutate } = useSWR<StatsData>(
    `/api/portal/dialer/stats?days=${days}`,
    fetcher,
    { refreshInterval: 60_000 }
  )

  const dailyChartData = useMemo(() => {
    if (!data?.dailyBreakdown) return []
    return data.dailyBreakdown.map((row) => ({
      label: new Date(row.date + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      Dials: row.dials,
      Contacts: row.contacts,
      Conversations: row.conversations,
      Demos: row.demos,
    }))
  }, [data?.dailyBreakdown])

  const outcomeChartData = useMemo(() => {
    if (!data?.outcomeBreakdown) return []
    return data.outcomeBreakdown.map((row) => ({
      name: row.outcome.replace(/_/g, " "),
      key: row.outcome,
      value: row.count,
    }))
  }, [data?.outcomeBreakdown])

  const statusChartData = useMemo(() => {
    if (!data?.leadStatusSummary) return []
    return data.leadStatusSummary.map((row) => ({
      name: row.status.replace(/_/g, " "),
      key: row.status,
      value: row.count,
    }))
  }, [data?.leadStatusSummary])

  const period = data?.period ?? { dials: 0, contacts: 0, conversations: 0, demos: 0, days: 30 }
  const rates = data?.rates ?? { contactRate: 0, conversationRate: 0, demoRate: 0 }

  if (isLoading) return <StatsSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
        <p className="text-sm">Failed to load stats.</p>
        <Button variant="outline" size="sm" onClick={() => mutate()}>
          <RefreshCw className="mr-1.5 size-3.5" />
          Retry
        </Button>
      </div>
    )
  }

  const today = data?.today ?? { dials: 0, contacts: 0, conversations: 0, demos: 0 }

  return (
    <div className="space-y-4 pt-2">
      {/* Today's live stats strip */}
      <Card className="bg-card border-orange-500/20">
        <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-500">
            Today
          </p>
          <div className="flex items-center gap-1.5">
            <Phone className="size-3.5 text-orange-400" />
            <span className="text-sm font-bold tabular-nums">{today.dials}</span>
            <span className="text-xs text-muted-foreground">dials</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 text-blue-400" />
            <span className="text-sm font-bold tabular-nums">{today.contacts}</span>
            <span className="text-xs text-muted-foreground">contacts</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="size-3.5 text-amber-400" />
            <span className="text-sm font-bold tabular-nums">{today.conversations}</span>
            <span className="text-xs text-muted-foreground">conversations</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarCheck className="size-3.5 text-emerald-400" />
            <span className="text-sm font-bold tabular-nums">{today.demos}</span>
            <span className="text-xs text-muted-foreground">demos booked</span>
          </div>
          {today.demos > 0 && (
            <div className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5">
              <span className="text-xs font-semibold text-emerald-400">
                ${(today.demos * REVENUE_PER_DEMO).toLocaleString()}
              </span>
              <span className="text-[10px] text-emerald-400/60">projected</span>
            </div>
          )}
          {today.dials > 0 && (
            <span className="ml-auto text-xs text-muted-foreground">
              {today.demos > 0
                ? `${((today.demos / today.dials) * 100).toFixed(1)}% close rate`
                : `${today.dials} dial${today.dials !== 1 ? "s" : ""} — no demos yet`}
            </span>
          )}
        </CardContent>
      </Card>

      {/* Header row with days selector */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Performance over the last {days} days
        </p>
        <DaysSelector days={days} onChange={setDays} />
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Dials"
          value={period.dials}
          icon={Phone}
          accent="text-orange-500"
        />
        <KpiCard
          label="Contacts Made"
          value={period.contacts}
          rate={rates.contactRate}
          rateLabel="contact rate"
          icon={Users}
          accent="text-blue-500"
        />
        <KpiCard
          label="Conversations"
          value={period.conversations}
          rate={rates.conversationRate}
          rateLabel="of contacts"
          icon={MessageSquare}
          accent="text-amber-500"
        />
        <KpiCard
          label="Demos Booked"
          value={period.demos}
          rate={rates.demoRate}
          rateLabel="close rate"
          icon={CalendarCheck}
          accent="text-emerald-500"
          revenueProjection
        />
      </div>

      {/* Daily area chart */}
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <TrendingUp className="size-4" />
            Daily Activity — {days}-Day Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyChartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              No daily data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={dailyChartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradDials" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradContacts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradDemos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Dials"
                  stroke="#f97316"
                  strokeWidth={2}
                  fill="url(#gradDials)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="Contacts"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#gradContacts)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="Demos"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fill="url(#gradDemos)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Two smaller charts */}
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Outcome breakdown bar chart */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outcome Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {outcomeChartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No outcome data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={outcomeChartData}
                  layout="vertical"
                  margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    strokeOpacity={0.4}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={90}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <RechartsTooltip
                    content={({ active, payload, label }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium">{label}</p>
                          <p className="text-orange-400">{payload[0].value} calls</p>
                        </div>
                      ) : null
                    }
                  />
                  <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                    {outcomeChartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={OUTCOME_COLORS[entry.key] ?? "#6b7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Lead status summary pie chart */}
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lead Status Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                No status data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    outerRadius={70}
                    strokeWidth={2}
                    stroke="hsl(var(--background))"
                  >
                    {statusChartData.map((entry) => (
                      <Cell
                        key={entry.key}
                        fill={STATUS_COLORS[entry.key] ?? "#6b7280"}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    content={({ active, payload }) =>
                      active && payload?.length ? (
                        <div className="rounded-lg border bg-card px-3 py-2 shadow-lg text-xs">
                          <p className="font-medium capitalize">{payload[0].name}</p>
                          <p className="text-muted-foreground">
                            {(payload[0].value as number).toLocaleString()} leads
                          </p>
                        </div>
                      ) : null
                    }
                  />
                  <Legend
                    iconSize={8}
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-[10px] capitalize text-muted-foreground">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
