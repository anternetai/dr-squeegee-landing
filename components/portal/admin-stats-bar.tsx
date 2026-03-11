"use client"

import { Users, DollarSign, Phone } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/portal/format"
import {
  CLIENT_PIPELINE_STAGES,
  CLIENT_PIPELINE_CONFIG,
} from "@/lib/portal/constants"
import type { AdminClientMetrics } from "@/lib/portal/types"

interface AdminStatsBarProps {
  clients: AdminClientMetrics[] | undefined
  isLoading?: boolean
}

function getPipelineSummary(clients: AdminClientMetrics[]): string {
  const counts = CLIENT_PIPELINE_STAGES.map((stage) => {
    const count = clients.filter(
      (c) => (c.pipeline_stage ?? "contacted") === stage
    ).length
    return { stage, count }
  }).filter((s) => s.count > 0)

  if (counts.length === 0) return "No clients"

  return counts
    .map((s) => `${s.count} ${CLIENT_PIPELINE_CONFIG[s.stage].label}`)
    .join(" \u00B7 ")
}

function getRevenueThisMonth(clients: AdminClientMetrics[]): number {
  // total_charged is already computed per client from the admin API
  // This is a rough approximation; for per-month we'd need payment dates
  // For now, sum all total_charged across clients
  return clients.reduce((sum, c) => sum + (c.total_charged ?? 0), 0)
}

function getUpcomingCalls(clients: AdminClientMetrics[]): number {
  const now = new Date()
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  return clients.filter((c) => {
    if (!c.next_call_at) return false
    const callDate = new Date(c.next_call_at)
    return callDate >= now && callDate <= sevenDaysOut
  }).length
}

export function AdminStatsBar({ clients, isLoading }: AdminStatsBarProps) {
  const stats = [
    {
      title: "Pipeline",
      value: clients ? getPipelineSummary(clients) : null,
      icon: Users,
      isText: true,
      accent: "border-orange-500/70",
    },
    {
      title: "Total Revenue",
      value: clients ? formatCurrency(getRevenueThisMonth(clients)) : null,
      icon: DollarSign,
      isText: false,
      accent: "border-green-500/70",
    },
    {
      title: "Upcoming Calls",
      value: clients ? String(getUpcomingCalls(clients)) : null,
      icon: Phone,
      isText: false,
      accent: "border-blue-500/70",
    },
    {
      title: "Active Clients",
      value: clients ? String(clients.length) : null,
      icon: Users,
      isText: false,
      accent: "border-purple-500/70",
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title} className={cn("border-t-2 transition-shadow hover:shadow-lg dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]", stat.accent)}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading || stat.value === null ? (
              <Skeleton className="h-7 w-32" />
            ) : stat.isText ? (
              <p className="text-sm font-semibold leading-snug">{stat.value}</p>
            ) : (
              <p
                className="text-2xl font-bold"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {stat.value}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
