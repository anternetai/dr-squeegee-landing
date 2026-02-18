"use client"

import { use, Suspense, useCallback } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import { Phone, Zap, BarChart3, History } from "lucide-react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { CallDashboard } from "@/components/portal/calls/call-dashboard"
import { QuickLog } from "@/components/portal/calls/quick-log"
import { CallHistory } from "@/components/portal/calls/call-history"
import { DailyLogDialog } from "@/components/portal/calls/daily-log-dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import type { CallDashboardData } from "@/app/api/portal/calls/dashboard/route"

async function fetchDashboard(): Promise<CallDashboardData> {
  const res = await fetch("/api/portal/calls/dashboard")
  if (!res.ok) throw new Error("Failed to fetch dashboard data")
  return res.json()
}

function CallsContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  const { data, isLoading, mutate } = useSWR("calls-dashboard", fetchDashboard, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })

  const handleLogCall = useCallback(
    async (log: Record<string, unknown>) => {
      const res = await fetch("/api/portal/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      })
      if (!res.ok) throw new Error("Failed to log call")
      mutate()
    },
    [mutate]
  )

  const handleUpdateStats = useCallback(
    async (stats: Record<string, number>) => {
      const today = new Date().toISOString().split("T")[0]
      const res = await fetch("/api/portal/calls/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ call_date: today, ...stats }),
      })
      if (!res.ok) throw new Error("Failed to update stats")
      mutate()
    },
    [mutate]
  )

  const handleDailyLog = useCallback(
    async (formData: {
      call_date: string
      total_dials: number
      contacts: number
      conversations: number
      demos_booked: number
      demos_held: number
      deals_closed: number
      hours_dialed: number
      notes: string
    }) => {
      const res = await fetch("/api/portal/calls/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error("Failed to save daily stats")
      mutate()
    },
    [mutate]
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cold Call Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Track your daily dials, contacts, and demos booked
          </p>
        </div>
        <DailyLogDialog onSubmit={handleDailyLog} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="quick-log" className="gap-1.5">
            <Zap className="size-3.5" />
            <span className="hidden sm:inline">Quick Log</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="size-3.5" />
            <span className="hidden sm:inline">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <CallDashboard data={data} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="quick-log">
          <QuickLog
            todayLogs={data?.todayLogs || []}
            todayStats={{
              total_dials: data?.today.total_dials || 0,
              contacts: data?.today.contacts || 0,
              conversations: data?.today.conversations || 0,
              demos_booked: data?.today.demos_booked || 0,
            }}
            onLogCall={handleLogCall}
            onUpdateStats={handleUpdateStats}
          />
        </TabsContent>

        <TabsContent value="history">
          <CallHistory
            dailyHistory={data?.dailyHistory || []}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function CallsPage() {
  return (
    <Suspense fallback={<CallsSkeleton />}>
      <CallsContent />
    </Suspense>
  )
}

function CallsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-10 w-72" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-40" />
      <Skeleton className="h-64" />
    </div>
  )
}
