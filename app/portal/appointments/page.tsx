"use client"

import { use } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { AppointmentsTable } from "@/components/portal/appointments-table"

export default function AppointmentsPage() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Appointments</h1>
        <p className="text-sm text-muted-foreground">
          Track appointment outcomes and billing
        </p>
      </div>
      <AppointmentsTable clientId={user.id} />
    </div>
  )
}
