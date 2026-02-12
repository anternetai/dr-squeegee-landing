"use client"

import { use } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { BillingTable } from "@/components/portal/billing-table"

export default function BillingPage() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          Your charges and payment history
        </p>
      </div>
      <BillingTable clientId={user.id} />
    </div>
  )
}
