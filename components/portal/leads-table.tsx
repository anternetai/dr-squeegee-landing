"use client"

import { useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Download, ChevronDown, ChevronRight, Users } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { StatusBadge } from "./status-badge"
import { formatDate, formatPhone, getRelativeTime } from "@/lib/portal/format"
import { LEAD_STATUS_CONFIG } from "@/lib/portal/constants"
import type { Lead, LeadStatus } from "@/lib/portal/types"

interface LeadsTableProps {
  clientId: string
}

const PAGE_SIZE = 20

async function fetchLeads([, clientId, status, search, page]: [string, string, string, string, string]) {
  const supabase = createClient()
  const pageNum = parseInt(page) || 1
  const from = (pageNum - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status && status !== "all") {
    query = query.eq("status", status)
  }

  if (search) {
    query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, count } = await query
  return { leads: (data ?? []) as Lead[], total: count ?? 0 }
}

export function LeadsTable({ clientId }: LeadsTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const status = searchParams.get("status") || "all"
  const search = searchParams.get("search") || ""
  const page = searchParams.get("page") || "1"

  const { data, isLoading } = useSWR(
    ["leads", clientId, status, search, page],
    fetchLeads,
    { revalidateOnFocus: false }
  )

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(key, value)
      } else {
        params.delete(key)
      }
      if (key !== "page") params.delete("page")
      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0
  const currentPage = parseInt(page) || 1

  async function handleExport() {
    const { exportToCsv } = await import("@/lib/portal/csv-export")
    if (!data?.leads.length) return
    exportToCsv(
      data.leads,
      [
        { header: "Name", accessor: (l) => l.name },
        { header: "Phone", accessor: (l) => l.phone },
        { header: "Email", accessor: (l) => l.email },
        { header: "Status", accessor: (l) => l.status },
        { header: "Source", accessor: (l) => l.source },
        { header: "Date", accessor: (l) => l.created_at },
      ],
      `leads-${new Date().toISOString().split("T")[0]}`
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => updateParam("search", e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(LEAD_STATUS_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={!data?.leads.length}>
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
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">Source</TableHead>
              <TableHead className="hidden lg:table-cell">Date</TableHead>
              <TableHead className="hidden xl:table-cell">Last Contact</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}>
                    <Skeleton className="h-8 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : !data?.leads.length ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-8" />
                    <p className="font-medium">No leads yet</p>
                    <p className="max-w-sm text-sm">
                      Once your ads start running, new leads will show up here
                      automatically. You&apos;ll be able to filter, search, and export them.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.leads.map((lead) => (
                <>
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() =>
                      setExpandedId(expandedId === lead.id ? null : lead.id)
                    }
                  >
                    <TableCell>
                      {expandedId === lead.id ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </TableCell>
                    <TableCell className="min-w-0 font-medium">
                      <span className="truncate">{lead.name}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {formatPhone(lead.phone)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={lead.status} type="lead" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {lead.source || "—"}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {formatDate(lead.created_at)}
                    </TableCell>
                    <TableCell className="hidden xl:table-cell text-muted-foreground">
                      {lead.updated_at ? getRelativeTime(lead.updated_at) : "—"}
                    </TableCell>
                  </TableRow>
                  {expandedId === lead.id && (
                    <TableRow key={`${lead.id}-detail`}>
                      <TableCell colSpan={7} className="bg-muted/50 p-4">
                        <LeadDetail lead={lead} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data?.total ?? 0} leads total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => updateParam("page", String(currentPage - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => updateParam("page", String(currentPage + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function LeadDetail({ lead }: { lead: Lead }) {
  return (
    <div className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <span className="text-muted-foreground">Name:</span>{" "}
        <span className="font-medium">{lead.name}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Phone:</span>{" "}
        <span className="font-medium" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatPhone(lead.phone)}
        </span>
      </div>
      <div>
        <span className="text-muted-foreground">Email:</span>{" "}
        <span className="font-medium">{lead.email || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Source:</span>{" "}
        <span className="font-medium">{lead.source || "—"}</span>
      </div>
      <div>
        <span className="text-muted-foreground">Created:</span>{" "}
        <span className="font-medium">{formatDate(lead.created_at)}</span>
      </div>
      {lead.notes && (
        <div className="sm:col-span-2">
          <span className="text-muted-foreground">Notes:</span>{" "}
          <span>{lead.notes}</span>
        </div>
      )}
    </div>
  )
}
