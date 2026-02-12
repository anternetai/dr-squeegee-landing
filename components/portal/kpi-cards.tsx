"use client"

import { Users, CalendarCheck, TrendingUp, DollarSign, RefreshCw } from "lucide-react"
import useSWR from "swr"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatPercent } from "@/lib/portal/format"
import type { KpiData } from "@/lib/portal/types"

interface KpiCardsProps {
  clientId: string
  from: string
  to: string
}

interface ChartDataPoint {
  date: string
  label: string
  appointments: number
}

async function fetchKpis([, clientId, from, to]: [string, string, string, string]): Promise<KpiData> {
  const supabase = createClient()

  const [leadsRes, apptRes, showedRes, paymentsRes] = await Promise.all([
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "showed")
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("client_id", clientId)
      .eq("status", "succeeded")
      .gte("created_at", from)
      .lte("created_at", `${to}T23:59:59`),
  ])

  const totalLeads = leadsRes.count ?? 0
  const totalBooked = apptRes.count ?? 0
  const totalShowed = showedRes.count ?? 0
  const showRate = totalBooked > 0 ? (totalShowed / totalBooked) * 100 : 0
  const totalCharged = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + ((p.amount_cents ?? 0) / 100),
    0
  )

  return {
    total_leads: totalLeads,
    appointments_booked: totalBooked,
    show_rate: showRate,
    total_charged: totalCharged,
  }
}

async function fetchChartData([, clientId, from, to]: [string, string, string, string]): Promise<ChartDataPoint[]> {
  const supabase = createClient()

  const { data: appointments } = await supabase
    .from("appointments")
    .select("created_at")
    .eq("client_id", clientId)
    .gte("created_at", from)
    .lte("created_at", `${to}T23:59:59`)
    .order("created_at", { ascending: true })

  // Build a map of date → count
  const counts = new Map<string, number>()
  for (const appt of appointments ?? []) {
    const day = appt.created_at.split("T")[0]
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }

  // Fill in all days in range
  const points: ChartDataPoint[] = []
  const start = new Date(from + "T00:00:00")
  const end = new Date(to + "T00:00:00")
  const cursor = new Date(start)

  while (cursor <= end) {
    const key = cursor.toISOString().split("T")[0]
    const label = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(cursor)
    points.push({
      date: key,
      label,
      appointments: counts.get(key) ?? 0,
    })
    cursor.setDate(cursor.getDate() + 1)
  }

  return points
}

export function KpiCards({ clientId, from, to }: KpiCardsProps) {
  const { data, mutate } = useSWR(
    ["kpis", clientId, from, to],
    fetchKpis,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const { data: chartData } = useSWR(
    ["chart", clientId, from, to],
    fetchChartData,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const cards = [
    {
      title: "Total Leads",
      value: String(data?.total_leads ?? 0),
      icon: Users,
    },
    {
      title: "Appointments Booked",
      value: String(data?.appointments_booked ?? 0),
      icon: CalendarCheck,
    },
    {
      title: "Show Rate",
      value: formatPercent(data?.show_rate ?? 0),
      icon: TrendingUp,
    },
    {
      title: "Total Charged",
      value: formatCurrency(data?.total_charged ?? 0),
      icon: DollarSign,
    },
  ]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => mutate()}
          aria-label="Refresh data"
        >
          <RefreshCw className="mr-1 size-3.5" />
          Refresh
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ fontVariantNumeric: "tabular-nums" }}>
                {card.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Appointments Booked Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!chartData?.length ? (
            <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
              Appointment data will appear here as leads get booked.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12 }}
                  className="fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="rounded-lg border bg-background px-3 py-2 shadow-sm">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                          {payload[0].value} appointment{payload[0].value === 1 ? "" : "s"}
                        </p>
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="appointments"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  fill="url(#colorAppt)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
