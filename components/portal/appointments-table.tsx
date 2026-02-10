"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { CalendarCheck, Download, CheckCircle, XCircle } from "lucide-react"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "./status-badge"
import { formatDateTime, formatCurrency } from "@/lib/portal/format"
import type { Appointment } from "@/lib/portal/types"

interface AppointmentsTableProps {
  clientId: string
}

async function fetchAppointments([, clientId, tab]: [string, string, string]) {
  const supabase = createClient()
  const now = new Date().toISOString()

  let query = supabase
    .from("appointments")
    .select("*, lead:leads(name, phone)")
    .eq("client_id", clientId)

  if (tab === "upcoming") {
    query = query
      .gte("scheduled_at", now)
      .in("status", ["scheduled", "confirmed", "rescheduled"])
      .order("scheduled_at", { ascending: true })
  } else {
    query = query
      .or(`scheduled_at.lt.${now},status.in.(showed,no_show,cancelled)`)
      .order("scheduled_at", { ascending: false })
  }

  const { data } = await query
  return (data ?? []) as (Appointment & { lead: { name: string; phone: string } | null })[]
}

export function AppointmentsTable({ clientId }: AppointmentsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") || "upcoming"

  const { data: appointments, isLoading, mutate } = useSWR(
    ["appointments", clientId, tab],
    fetchAppointments,
    { revalidateOnFocus: false }
  )

  const [confirmAction, setConfirmAction] = useState<{
    type: "showed" | "no_show"
    appointment: Appointment & { lead: { name: string; phone: string } | null }
  } | null>(null)

  const [outcomeData, setOutcomeData] = useState<{
    appointmentId: string
    quoteGiven: boolean
    quoteAmount: string
    jobSold: boolean
    jobAmount: string
  } | null>(null)

  async function handleStatusUpdate(id: string, status: "showed" | "no_show") {
    const res = await fetch(`/api/portal/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })

    if (res.ok && status === "showed") {
      setOutcomeData({
        appointmentId: id,
        quoteGiven: false,
        quoteAmount: "",
        jobSold: false,
        jobAmount: "",
      })
    }

    setConfirmAction(null)
    mutate()
  }

  async function handleOutcomeSubmit() {
    if (!outcomeData) return
    await fetch(`/api/portal/appointments/${outcomeData.appointmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome_quote_given: outcomeData.quoteGiven,
        outcome_quote_amount: outcomeData.quoteAmount ? parseFloat(outcomeData.quoteAmount) : null,
        outcome_job_sold: outcomeData.jobSold,
        outcome_job_amount: outcomeData.jobAmount ? parseFloat(outcomeData.jobAmount) : null,
      }),
    })
    setOutcomeData(null)
    mutate()
  }

  async function handleExport() {
    const { exportToCsv } = await import("@/lib/portal/csv-export")
    if (!appointments?.length) return
    exportToCsv(
      appointments,
      [
        { header: "Lead", accessor: (a) => a.lead?.name ?? "Unknown" },
        { header: "Date/Time", accessor: (a) => a.scheduled_at },
        { header: "Status", accessor: (a) => a.status },
      ],
      `appointments-${tab}-${new Date().toISOString().split("T")[0]}`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            const params = new URLSearchParams(searchParams.toString())
            params.set("tab", v)
            router.push(`?${params.toString()}`)
          }}
        >
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!appointments?.length}>
                <Download className="mr-1.5 size-3.5" />
                CSV
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Export to CSV &mdash; add to your CRM or spreadsheet
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lead</TableHead>
              <TableHead>Date / Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !appointments?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <CalendarCheck className="size-8" />
                    <p className="font-medium">No {tab} appointments</p>
                    <p className="max-w-sm text-sm">
                      When leads are qualified and booked, they&apos;ll appear here
                      with options to mark attendance and track outcomes.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appt) => (
                <TableRow key={appt.id}>
                  <TableCell className="font-medium">
                    {appt.lead?.name ?? "Unknown"}
                  </TableCell>
                  <TableCell style={{ fontVariantNumeric: "tabular-nums" }}>
                    {formatDateTime(appt.scheduled_at)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={appt.status} type="appointment" />
                  </TableCell>
                  <TableCell className="text-right">
                    {(appt.status === "scheduled" || appt.status === "confirmed") && (
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ type: "showed", appointment: appt })
                          }
                        >
                          <CheckCircle className="mr-1 size-3.5" />
                          Showed
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setConfirmAction({ type: "no_show", appointment: appt })
                          }
                        >
                          <XCircle className="mr-1 size-3.5" />
                          No-Show
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === "showed"
                ? "Mark as Showed?"
                : "Mark as No-Show?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === "showed"
                ? `This will charge your account ${formatCurrency(200)} for ${confirmAction.appointment.lead?.name ?? "this lead"}'s appointment.`
                : `Mark ${confirmAction?.appointment.lead?.name ?? "this lead"}'s appointment as a no-show. No charge will be applied.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  handleStatusUpdate(
                    confirmAction.appointment.id,
                    confirmAction.type
                  )
                }
              }}
              className={
                confirmAction?.type === "showed" ? "" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {confirmAction?.type === "showed"
                ? `Confirm & Charge ${formatCurrency(200)}`
                : "Confirm No-Show"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Outcome dialog */}
      <Dialog open={!!outcomeData} onOpenChange={() => setOutcomeData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quote-given">Quote given?</Label>
              <Switch
                id="quote-given"
                checked={outcomeData?.quoteGiven ?? false}
                onCheckedChange={(v) =>
                  setOutcomeData((d) => (d ? { ...d, quoteGiven: v } : null))
                }
              />
            </div>
            {outcomeData?.quoteGiven && (
              <div className="space-y-1">
                <Label htmlFor="quote-amount">Quote amount ($)</Label>
                <Input
                  id="quote-amount"
                  type="number"
                  placeholder="0"
                  value={outcomeData.quoteAmount}
                  onChange={(e) =>
                    setOutcomeData((d) =>
                      d ? { ...d, quoteAmount: e.target.value } : null
                    )
                  }
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label htmlFor="job-sold">Job sold?</Label>
              <Switch
                id="job-sold"
                checked={outcomeData?.jobSold ?? false}
                onCheckedChange={(v) =>
                  setOutcomeData((d) => (d ? { ...d, jobSold: v } : null))
                }
              />
            </div>
            {outcomeData?.jobSold && (
              <div className="space-y-1">
                <Label htmlFor="job-amount">Job amount ($)</Label>
                <Input
                  id="job-amount"
                  type="number"
                  placeholder="0"
                  value={outcomeData.jobAmount}
                  onChange={(e) =>
                    setOutcomeData((d) =>
                      d ? { ...d, jobAmount: e.target.value } : null
                    )
                  }
                  style={{ fontVariantNumeric: "tabular-nums" }}
                />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOutcomeData(null)}>
                Skip
              </Button>
              <Button onClick={handleOutcomeSubmit}>Save Outcome</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
