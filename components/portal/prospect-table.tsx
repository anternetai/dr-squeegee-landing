"use client"

import { useState, useCallback } from "react"
import {
  Search,
  Phone,
  ClipboardList,
  CalendarClock,
  Trash2,
  ArrowUpDown,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CALL_OUTCOME_CONFIG } from "@/lib/portal/constants"
import { formatDate, formatPhone, getRelativeTime, googleVoiceUrl } from "@/lib/portal/format"
import type { CrmProspect } from "@/lib/portal/types"

interface ProspectTableProps {
  prospects: CrmProspect[]
  total: number
  page: number
  isLoading: boolean
  onPageChange: (page: number) => void
  onSearchChange: (search: string) => void
  onOutcomeFilterChange: (outcome: string) => void
  onUpdate: (id: string, data: Partial<CrmProspect>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  search: string
  outcomeFilter: string
}

const PAGE_SIZE = 20

type SortField = "name" | "follow_up_at" | "last_called_at"
type SortDir = "asc" | "desc"

export function ProspectTable({
  prospects,
  total,
  page,
  isLoading,
  onPageChange,
  onSearchChange,
  onOutcomeFilterChange,
  onUpdate,
  onDelete,
  search,
  outcomeFilter,
}: ProspectTableProps) {
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [outcomeDialogId, setOutcomeDialogId] = useState<string | null>(null)
  const [followUpDialogId, setFollowUpDialogId] = useState<string | null>(null)
  const [deleteDialogId, setDeleteDialogId] = useState<string | null>(null)
  const [outcomeValue, setOutcomeValue] = useState("")
  const [outcomeNotes, setOutcomeNotes] = useState("")
  const [followUpDate, setFollowUpDate] = useState("")
  const [saving, setSaving] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const toggleSort = useCallback((field: SortField) => {
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"))
        return prev
      }
      setSortDir("asc")
      return field
    })
  }, [])

  // Client-side sort on the current page data
  const sorted = [...prospects].sort((a, b) => {
    const dir = sortDir === "asc" ? 1 : -1
    if (sortField === "name") {
      return dir * a.name.localeCompare(b.name)
    }
    if (sortField === "follow_up_at") {
      const aVal = a.follow_up_at ? new Date(a.follow_up_at).getTime() : 0
      const bVal = b.follow_up_at ? new Date(b.follow_up_at).getTime() : 0
      return dir * (aVal - bVal)
    }
    if (sortField === "last_called_at") {
      const aVal = a.last_called_at ? new Date(a.last_called_at).getTime() : 0
      const bVal = b.last_called_at ? new Date(b.last_called_at).getTime() : 0
      return dir * (aVal - bVal)
    }
    return 0
  })

  async function handleLogOutcome() {
    if (!outcomeDialogId || !outcomeValue) return
    setSaving(true)
    try {
      await onUpdate(outcomeDialogId, {
        call_outcome: outcomeValue as CrmProspect["call_outcome"],
        last_called_at: new Date().toISOString(),
        notes: outcomeNotes || undefined,
      } as Partial<CrmProspect>)
      setOutcomeDialogId(null)
      setOutcomeValue("")
      setOutcomeNotes("")
    } finally {
      setSaving(false)
    }
  }

  async function handleSetFollowUp() {
    if (!followUpDialogId || !followUpDate) return
    setSaving(true)
    try {
      await onUpdate(followUpDialogId, {
        follow_up_at: new Date(followUpDate).toISOString(),
      })
      setFollowUpDialogId(null)
      setFollowUpDate("")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteDialogId) return
    setSaving(true)
    try {
      await onDelete(deleteDialogId)
      setDeleteDialogId(null)
    } finally {
      setSaving(false)
    }
  }

  function openOutcomeDialog(prospect: CrmProspect) {
    setOutcomeDialogId(prospect.id)
    setOutcomeValue(prospect.call_outcome || "")
    setOutcomeNotes(prospect.notes || "")
  }

  function openFollowUpDialog(prospect: CrmProspect) {
    setFollowUpDialogId(prospect.id)
    setFollowUpDate(
      prospect.follow_up_at
        ? new Date(prospect.follow_up_at).toISOString().slice(0, 16)
        : ""
    )
  }

  function SortableHeader({
    field,
    children,
    className,
  }: {
    field: SortField
    children: React.ReactNode
    className?: string
  }) {
    return (
      <TableHead className={className}>
        <button
          onClick={() => toggleSort(field)}
          className="inline-flex items-center gap-1 hover:text-foreground"
        >
          {children}
          <ArrowUpDown
            className={cn(
              "size-3",
              sortField === field
                ? "text-foreground"
                : "text-muted-foreground/50"
            )}
          />
        </button>
      </TableHead>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={outcomeFilter} onValueChange={onOutcomeFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All outcomes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="uncalled">Not called</SelectItem>
            {Object.entries(CALL_OUTCOME_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>
                {cfg.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="name">Name</SortableHeader>
              <TableHead className="hidden sm:table-cell">Phone</TableHead>
              <TableHead className="hidden md:table-cell">Email</TableHead>
              <TableHead>Outcome</TableHead>
              <SortableHeader field="follow_up_at" className="hidden lg:table-cell">
                Follow-up
              </SortableHeader>
              <SortableHeader field="last_called_at" className="hidden lg:table-cell">
                Last Called
              </SortableHeader>
              <TableHead className="text-right">Actions</TableHead>
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
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <UserPlus className="size-8" />
                    <p className="font-medium">No prospects yet</p>
                    <p className="max-w-sm text-sm">
                      Upload a CSV to get started. You can import a list of
                      businesses to call and track your outreach progress.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((prospect) => (
                <TableRow key={prospect.id}>
                  <TableCell className="font-medium">{prospect.name}</TableCell>
                  <TableCell
                    className="hidden sm:table-cell"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {prospect.phone ? (
                      <a
                        href={googleVoiceUrl(prospect.phone!)} target="_blank" rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {formatPhone(prospect.phone)}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
                    {prospect.email || "--"}
                  </TableCell>
                  <TableCell>
                    {prospect.call_outcome ? (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          CALL_OUTCOME_CONFIG[prospect.call_outcome]?.color ??
                            "bg-gray-100 text-gray-800"
                        )}
                      >
                        {CALL_OUTCOME_CONFIG[prospect.call_outcome]?.label ??
                          prospect.call_outcome}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {prospect.follow_up_at
                      ? formatDate(prospect.follow_up_at)
                      : "--"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground">
                    {prospect.last_called_at
                      ? getRelativeTime(prospect.last_called_at)
                      : "--"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {prospect.phone && (
                        <Button variant="ghost" size="icon-xs" asChild>
                          <a href={googleVoiceUrl(prospect.phone!)} target="_blank" rel="noopener noreferrer" title="Call">
                            <Phone className="size-3" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Log outcome"
                        onClick={() => openOutcomeDialog(prospect)}
                      >
                        <ClipboardList className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Set follow-up"
                        onClick={() => openFollowUpDialog(prospect)}
                      >
                        <CalendarClock className="size-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Delete"
                        onClick={() => setDeleteDialogId(prospect.id)}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} prospect{total !== 1 ? "s" : ""} total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="flex items-center px-2 text-sm text-muted-foreground">
              {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Log Outcome Dialog */}
      <Dialog
        open={!!outcomeDialogId}
        onOpenChange={(open) => {
          if (!open) {
            setOutcomeDialogId(null)
            setOutcomeValue("")
            setOutcomeNotes("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log Call Outcome</DialogTitle>
            <DialogDescription>
              Record the result of this call and add any notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Outcome</Label>
              <Select value={outcomeValue} onValueChange={setOutcomeValue}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CALL_OUTCOME_CONFIG).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>
                      {cfg.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={outcomeNotes}
                onChange={(e) => setOutcomeNotes(e.target.value)}
                placeholder="Any notes about the call..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOutcomeDialogId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLogOutcome}
              disabled={!outcomeValue || saving}
            >
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Set Follow-Up Dialog */}
      <Dialog
        open={!!followUpDialogId}
        onOpenChange={(open) => {
          if (!open) {
            setFollowUpDialogId(null)
            setFollowUpDate("")
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Follow-Up</DialogTitle>
            <DialogDescription>
              Schedule a follow-up date for this prospect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Follow-up Date & Time</Label>
            <Input
              type="datetime-local"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFollowUpDialogId(null)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSetFollowUp}
              disabled={!followUpDate || saving}
            >
              Save Follow-Up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteDialogId}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
            <AlertDialogDescription>
              This prospect will be permanently removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
