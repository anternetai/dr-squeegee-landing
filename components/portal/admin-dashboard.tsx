"use client"

import { useState } from "react"
import { AlertTriangle, Users, TrendingDown, Trash2 } from "lucide-react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatCurrency, formatPercent, getRelativeTime } from "@/lib/portal/format"
import type { AdminClientMetrics } from "@/lib/portal/types"

async function fetchAdminData() {
  const res = await fetch("/api/portal/admin")
  if (!res.ok) throw new Error("Failed to fetch admin data")
  const data = await res.json()
  return data.clients as AdminClientMetrics[]
}

export function AdminDashboard() {
  const { data: clients, isLoading, mutate } = useSWR("admin-clients", fetchAdminData, {
    revalidateOnFocus: false,
  })
  const [deleteTarget, setDeleteTarget] = useState<AdminClientMetrics | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/portal/admin/clients/${deleteTarget.id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        mutate()
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    )
  }

  if (!clients?.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
        <Users className="size-8" />
        <p>No clients yet.</p>
      </div>
    )
  }

  return (
    <>
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => {
        const daysSinceLastLead = client.last_lead_at
          ? Math.floor(
              (Date.now() - new Date(client.last_lead_at).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : null

        const noLeadsAlert = daysSinceLastLead !== null && daysSinceLastLead >= 3
        const lowShowRate = client.appointment_count > 0 && client.show_rate < 50

        return (
          <Card key={client.id}>
            {(noLeadsAlert || lowShowRate) && (
              <div className="flex gap-1 px-6 pt-4">
                {noLeadsAlert && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400">
                    <AlertTriangle className="mr-1 size-3" />
                    No leads {daysSinceLastLead}d
                  </Badge>
                )}
                {lowShowRate && (
                  <Badge variant="outline" className="border-red-500 text-red-600 dark:text-red-400">
                    <TrendingDown className="mr-1 size-3" />
                    Low show rate
                  </Badge>
                )}
              </div>
            )}
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{client.legal_business_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {client.first_name} {client.last_name} &middot; {client.service_type}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(client)}
                  aria-label={`Delete ${client.legal_business_name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Leads</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.lead_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Appointments</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.appointment_count}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Show Rate</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {client.appointment_count > 0
                      ? formatPercent(client.show_rate)
                      : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Charged</p>
                  <p className="text-lg font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatCurrency(client.total_charged)}
                  </p>
                </div>
              </div>
              {client.last_lead_at && (
                <p className="mt-3 text-xs text-muted-foreground">
                  Last lead: {getRelativeTime(client.last_lead_at)}
                </p>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>

    <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete client?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.legal_business_name}
            </span>{" "}
            and all their data. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
