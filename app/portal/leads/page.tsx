"use client"

import { use } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { LeadsTable } from "@/components/portal/leads-table"

export default function LeadsPage() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-sm text-muted-foreground">
          All leads from your campaigns
        </p>
      </div>
      <LeadsTable clientId={user.id} />
    </div>
  )
}
