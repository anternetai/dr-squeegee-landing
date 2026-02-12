"use client"

import { CreditCard, Download } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "./status-badge"
import { formatDate, formatCurrency } from "@/lib/portal/format"
import type { Payment } from "@/lib/portal/types"

interface BillingTableProps {
  clientId: string
}

async function fetchPayments([, clientId]: [string, string]) {
  const supabase = createClient()
  const { data } = await supabase
    .from("payments")
    .select("*, appointment:appointments(lead:leads(name))")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })

  return (data ?? []) as (Payment & { appointment: { lead: { name: string } | null } | null })[]
}

export function BillingTable({ clientId }: BillingTableProps) {
  const { data: payments } = useSWR(
    ["payments", clientId],
    fetchPayments,
    { revalidateOnFocus: false, shouldRetryOnError: false }
  )

  const runningTotal = (payments ?? [])
    .filter((p) => p.status === "succeeded")
    .reduce((sum, p) => sum + p.amount_cents / 100, 0)

  async function handleExport() {
    const { exportToCsv } = await import("@/lib/portal/csv-export")
    if (!payments?.length) return
    exportToCsv(
      payments,
      [
        { header: "Date", accessor: (p) => p.created_at },
        { header: "Lead", accessor: (p) => p.appointment?.lead?.name ?? "—" },
        { header: "Amount", accessor: (p) => (p.amount_cents / 100).toFixed(2) },
        { header: "Status", accessor: (p) => p.status },
      ],
      `billing-${new Date().toISOString().split("T")[0]}`
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div>
            <p className="text-sm text-muted-foreground">Total Charged</p>
            <p
              className="text-2xl font-bold"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatCurrency(runningTotal)}
            </p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport} disabled={!payments?.length}>
                  <Download className="mr-1.5 size-3.5" />
                  CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Export to CSV &mdash; add to your CRM or spreadsheet
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>
      </Card>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Lead</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!payments?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CreditCard className="size-8" />
                    <p className="font-medium">No charges yet</p>
                    <p className="max-w-sm text-sm">
                      Your billing history will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-muted-foreground">
                    {formatDate(payment.created_at)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {payment.appointment?.lead?.name ?? "—"}
                  </TableCell>
                  <TableCell
                    className="text-right font-medium"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(payment.amount_cents / 100)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={payment.status} type="payment" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
