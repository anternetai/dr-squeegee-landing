"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { mockLeads } from "@/lib/mock-data";
import { Lead, LeadStatus, PhoneType } from "@/lib/types";
import {
  Plus,
  Search,
  ExternalLink,
  Pencil,
} from "lucide-react";

const statusColors: Record<LeadStatus, string> = {
  New: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Called: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  "No Answer": "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Callback: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  "Demo Booked": "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  "Not Interested": "bg-red-500/15 text-red-400 border-red-500/20",
};

const allStates = ["AZ", "CO", "FL", "GA", "NC", "TN", "TX"];
const allStatuses: LeadStatus[] = [
  "New",
  "Called",
  "No Answer",
  "Callback",
  "Demo Booked",
  "Not Interested",
];
const allPhoneTypes: PhoneType[] = ["Mobile", "Landline", "VOIP"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(mockLeads);
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPhoneType, setFilterPhoneType] = useState<string>("all");
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const emptyLead: Omit<Lead, "id"> = {
    companyName: "",
    ownerName: "",
    phone: "",
    state: "",
    website: "",
    phoneType: "Mobile",
    status: "New",
    lastCalled: null,
    notes: "",
  };
  const [newLead, setNewLead] = useState(emptyLead);

  const filtered = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !search ||
        lead.companyName.toLowerCase().includes(search.toLowerCase()) ||
        lead.ownerName.toLowerCase().includes(search.toLowerCase());
      const matchesState =
        filterState === "all" || lead.state === filterState;
      const matchesStatus =
        filterStatus === "all" || lead.status === filterStatus;
      const matchesPhoneType =
        filterPhoneType === "all" || lead.phoneType === filterPhoneType;
      return matchesSearch && matchesState && matchesStatus && matchesPhoneType;
    });
  }, [leads, search, filterState, filterStatus, filterPhoneType]);

  function handleAddLead() {
    const lead: Lead = {
      ...newLead,
      id: String(Date.now()),
    };
    setLeads([lead, ...leads]);
    setNewLead(emptyLead);
    setAddDialogOpen(false);
  }

  function handleUpdateLead(updated: Lead) {
    setLeads(leads.map((l) => (l.id === updated.id ? updated : l)));
    setEditingLead(null);
  }

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    leads.forEach((l) => {
      counts[l.status] = (counts[l.status] || 0) + 1;
    });
    return counts;
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Lead Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {leads.length} total leads · {statusCounts["New"] || 0} new
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Lead</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={newLead.companyName}
                    onChange={(e) =>
                      setNewLead({ ...newLead, companyName: e.target.value })
                    }
                    placeholder="Acme Roofing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={newLead.ownerName}
                    onChange={(e) =>
                      setNewLead({ ...newLead, ownerName: e.target.value })
                    }
                    placeholder="John Smith"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newLead.phone}
                    onChange={(e) =>
                      setNewLead({ ...newLead, phone: e.target.value })
                    }
                    placeholder="(555) 555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={newLead.state}
                    onChange={(e) =>
                      setNewLead({ ...newLead, state: e.target.value.toUpperCase() })
                    }
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input
                    value={newLead.website}
                    onChange={(e) =>
                      setNewLead({ ...newLead, website: e.target.value })
                    }
                    placeholder="example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Type</Label>
                  <Select
                    value={newLead.phoneType}
                    onValueChange={(v) =>
                      setNewLead({ ...newLead, phoneType: v as PhoneType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPhoneTypes.map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newLead.notes}
                  onChange={(e) =>
                    setNewLead({ ...newLead, notes: e.target.value })
                  }
                  placeholder="Any initial notes..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddLead} disabled={!newLead.companyName || !newLead.ownerName}>
                Add Lead
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {allStatuses.map((status) => (
          <Card
            key={status}
            className={`border-border bg-card cursor-pointer transition-colors ${
              filterStatus === status ? "ring-1 ring-primary" : ""
            }`}
            onClick={() =>
              setFilterStatus(filterStatus === status ? "all" : status)
            }
          >
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{statusCounts[status] || 0}</p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by company or owner..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {allStates.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {allStatuses.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPhoneType} onValueChange={setFilterPhoneType}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Phone Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {allPhoneTypes.map((pt) => (
                  <SelectItem key={pt} value={pt}>
                    {pt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Company</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Called</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    No leads found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((lead) => (
                  <TableRow
                    key={lead.id}
                    className="border-border cursor-pointer"
                    onClick={() => setEditingLead(lead)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.companyName}
                        {lead.website && (
                          <a
                            href={`https://${lead.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-muted-foreground hover:text-primary"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{lead.ownerName}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {lead.phone}
                    </TableCell>
                    <TableCell>{lead.state}</TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {lead.phoneType}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[lead.status]}
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {lead.lastCalled || "—"}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {lead.notes || "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingLead(lead);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingLead}
        onOpenChange={(open) => !open && setEditingLead(null)}
      >
        {editingLead && (
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>Edit Lead — {editingLead.companyName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={editingLead.companyName}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        companyName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={editingLead.ownerName}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        ownerName: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editingLead.phone}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={editingLead.status}
                    onValueChange={(v) =>
                      setEditingLead({
                        ...editingLead,
                        status: v as LeadStatus,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>State</Label>
                  <Input
                    value={editingLead.state}
                    onChange={(e) =>
                      setEditingLead({
                        ...editingLead,
                        state: e.target.value.toUpperCase(),
                      })
                    }
                    maxLength={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Type</Label>
                  <Select
                    value={editingLead.phoneType}
                    onValueChange={(v) =>
                      setEditingLead({
                        ...editingLead,
                        phoneType: v as PhoneType,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allPhoneTypes.map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {pt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={editingLead.website}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      website: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={editingLead.notes}
                  onChange={(e) =>
                    setEditingLead({
                      ...editingLead,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={() => handleUpdateLead(editingLead)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
