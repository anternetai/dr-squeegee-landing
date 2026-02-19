"use client"

import { use, Suspense } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { ColdCallTracker } from "@/components/portal/cold-calls/cold-call-tracker"
import { Skeleton } from "@/components/ui/skeleton"

function ColdCallsContent() {
  const { user } = use(PortalAuthContext)

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return <ColdCallTracker />
}

export default function ColdCallsPage() {
  return (
    <Suspense fallback={<ColdCallsSkeleton />}>
      <ColdCallsContent />
    </Suspense>
  )
}

function ColdCallsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}
