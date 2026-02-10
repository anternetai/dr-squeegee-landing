"use client"

import { use, useMemo } from "react"
import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { KpiCards } from "@/components/portal/kpi-cards"
import { PipelineFunnel } from "@/components/portal/pipeline-funnel"
import { DateRangeFilter } from "@/components/portal/date-range-filter"
import { Skeleton } from "@/components/ui/skeleton"

function getGreeting(firstName: string) {
  const hour = new Date().getHours()
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"
  const subtitles = [
    "Here's how things are looking.",
    "Your leads are working for you.",
    "Here's your latest snapshot.",
  ]
  const subtitle = subtitles[Math.floor(Date.now() / 86400000) % subtitles.length]
  return { greeting: `Good ${timeOfDay}, ${firstName}`, subtitle }
}

function DashboardContent() {
  const { user } = use(PortalAuthContext)
  const searchParams = useSearchParams()

  const { greeting, subtitle } = useMemo(
    () => getGreeting(user?.first_name ?? ""),
    [user?.first_name]
  )

  if (!user) return null

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const from = searchParams.get("from") || thirtyDaysAgo.toISOString().split("T")[0]
  const to = searchParams.get("to") || now.toISOString().split("T")[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ textWrap: "balance" }}>
            {greeting}
          </h1>
          <p className="text-sm text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <DateRangeFilter />
      </div>

      <KpiCards clientId={user.id} from={from} to={to} />

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Lead Pipeline</h2>
        <PipelineFunnel clientId={user.id} from={from} to={to} />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-32" />
    </div>
  )
}
