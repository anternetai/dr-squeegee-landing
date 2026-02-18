"use client"

import { useMemo } from "react"
import useSWR from "swr"
import {
  Phone,
  Users,
  CalendarCheck,
  Clock,
  TrendingUp,
  Archive,
  CheckCircle2,
  XCircle,
  MapPin,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import type { DialerTimezone, DailyDialerStats } from "@/lib/dialer/types"

type StatsResponse = DailyDialerStats & {
  totalDemos: number
  totalCompleted: number
  totalArchived: number
}

async function fetchStats(): Promise<StatsResponse> {
  const res = await fetch("/api/portal/dialer/stats")
  if (!res.ok) throw new Error("Failed to fetch stats")
  return res.json()
}

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
  no_answer: { label: "No Answer", color: "text-muted-foreground" },
  voicemail: { label: "Voicemail", color: "text-blue-500" },
  gatekeeper: { label: "Gatekeeper", color: "text-amber-500" },
  conversation: { label: "Conversation", color: "text-emerald-500" },
  demo_booked: { label: "Demo Booked", color: "text-purple-500" },
  not_interested: { label: "Not Interested", color: "text-red-500" },
  wrong_number: { label: "Wrong Number", color: "text-red-400" },
  callback: { label: "Callback", color: "text-orange-500" },
}

export function DialerStats() {
  const { data, isLoading } = useSWR("dialer-stats", fetchStats, {
    revalidateOnFocus: true,
    refreshInterval: 30000,
  })

  const totalOutcomes = useMemo(() => {
    if (!data?.todayOutcomes) return 0
    return Object.values(data.todayOutcomes).reduce((s, v) => s + v, 0)
  }, [data?.todayOutcomes])

  const contactRate = useMemo(() => {
    if (!data?.todayOutcomes || totalOutcomes === 0) return 0
    const contacts =
      (data.todayOutcomes.conversation || 0) +
      (data.todayOutcomes.demo_booked || 0) +
      (data.todayOutcomes.not_interested || 0) +
      (data.todayOutcomes.callback || 0)
    return (contacts / totalOutcomes) * 100
  }, [data?.todayOutcomes, totalOutcomes])

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Phone className="size-8" />
        <p>No dialer stats available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Queue
            </CardTitle>
            <Phone className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.totalLeads}</p>
            <p className="text-xs text-muted-foreground">callable leads remaining</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calls Today
            </CardTitle>
            <TrendingUp className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.completedToday}</p>
            <p className="text-xs text-muted-foreground">
              {contactRate.toFixed(0)}% contact rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Callbacks Due
            </CardTitle>
            <Clock className="size-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{data.callbacksDueToday}</p>
            <p className="text-xs text-muted-foreground">scheduled for today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Demos Booked
            </CardTitle>
            <CalendarCheck className="size-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums text-purple-500">
              {data.totalDemos}
            </p>
            <p className="text-xs text-muted-foreground">all time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Timezone Queue Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <MapPin className="size-4" />
              Queue by Timezone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["ET", "CT", "MT", "PT"] as DialerTimezone[]).map((tz) => {
              const count = data.breakdownByTimezone[tz] || 0
              const total = data.totalLeads || 1
              const pct = (count / total) * 100
              return (
                <div key={tz} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{tz}</span>
                    <span className="tabular-nums text-muted-foreground">{count} leads</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-orange-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Today's Outcomes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <TrendingUp className="size-4" />
              Today&apos;s Outcomes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {totalOutcomes === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No calls logged today yet.
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(data.todayOutcomes)
                  .sort(([, a], [, b]) => b - a)
                  .map(([outcome, count]) => {
                    const config = OUTCOME_LABELS[outcome]
                    return (
                      <div
                        key={outcome}
                        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
                      >
                        <span className={`text-sm font-medium ${config?.color || ""}`}>
                          {config?.label || outcome}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums">{count}</span>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            ({((count / totalOutcomes) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hour Schedule */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock className="size-4" />
            Daily Call Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.breakdownByHour.map((block, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <Badge variant="outline" className="shrink-0 text-[10px]">
                  {block.timezone}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-xs">{block.hour}</span>
                <span className="shrink-0 tabular-nums font-medium">{block.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <div>
              <p className="text-xl font-bold tabular-nums">{data.totalCompleted}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Archive className="size-5 text-muted-foreground" />
            <div>
              <p className="text-xl font-bold tabular-nums">{data.totalArchived}</p>
              <p className="text-xs text-muted-foreground">Archived (max attempts)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CalendarCheck className="size-5 text-purple-500" />
            <div>
              <p className="text-xl font-bold tabular-nums text-purple-500">{data.totalDemos}</p>
              <p className="text-xs text-muted-foreground">Total Demos Booked</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
