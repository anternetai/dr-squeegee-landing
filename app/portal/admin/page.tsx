"use client"

import { use, Suspense } from "react"
import { redirect } from "next/navigation"
import useSWR from "swr"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { AdminDashboard } from "@/components/portal/admin-dashboard"
import { InviteClientDialog } from "@/components/portal/invite-client-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import type { AdminClientMetrics } from "@/lib/portal/types"

async function fetchAdminClients() {
  const res = await fetch("/api/portal/admin")
  if (!res.ok) throw new Error("Failed to fetch")
  const data = await res.json()
  return data.clients as AdminClientMetrics[]
}

function AdminContent() {
  const { user } = use(PortalAuthContext)
  const { data: clients } = useSWR("admin-clients-page", fetchAdminClients, {
    revalidateOnFocus: false,
  })

  if (!user) return null

  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            All clients at a glance
          </p>
        </div>
        {clients && <InviteClientDialog clients={clients} />}
      </div>
      <AdminDashboard />
    </div>
  )
}

export default function AdminPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <AdminContent />
    </Suspense>
  )
}
