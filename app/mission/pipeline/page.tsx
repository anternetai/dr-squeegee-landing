"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { mockPipelineDeals } from "@/lib/mock-data";
import { PipelineDeal, PipelineStage } from "@/lib/types";
import {
  ChevronRight,
  ChevronLeft,
  Phone,
  User,
  Plus,
} from "lucide-react";

const stages: PipelineStage[] = [
  "Prospect",
  "Demo Scheduled",
  "Demo Completed",
  "Proposal Sent",
  "Signed",
  "Active",
];

const stageColors: Record<PipelineStage, string> = {
  Prospect: "text-gray-400",
  "Demo Scheduled": "text-blue-400",
  "Demo Completed": "text-amber-400",
  "Proposal Sent": "text-purple-400",
  Signed: "text-emerald-400",
  Active: "text-primary",
};

const stageBgColors: Record<PipelineStage, string> = {
  Prospect: "bg-gray-400/10",
  "Demo Scheduled": "bg-blue-400/10",
  "Demo Completed": "bg-amber-400/10",
  "Proposal Sent": "bg-purple-400/10",
  Signed: "bg-emerald-400/10",
  Active: "bg-primary/10",
};

export default function PipelinePage() {
  const [deals, setDeals] = useState<PipelineDeal[]>(mockPipelineDeals);
  const [selectedDeal, setSelectedDeal] = useState<PipelineDeal | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDeal, setNewDeal] = useState<Omit<PipelineDeal, "id">>({
    companyName: "",
    ownerName: "",
    phone: "",
    email: "",
    dealValue: 2400,
    stage: "Prospect",
    notes: "",
  });

  const dealsByStage = useMemo(() => {
    const map: Record<PipelineStage, PipelineDeal[]> = {
      Prospect: [],
      "Demo Scheduled": [],
      "Demo Completed": [],
      "Proposal Sent": [],
      Signed: [],
      Active: [],
    };
    deals.forEach((deal) => {
      map[deal.stage].push(deal);
    });
    return map;
  }, [deals]);

  const totalPipelineValue = useMemo(() => {
    return deals
      .filter((d) => d.stage !== "Active")
      .reduce((sum, d) => sum + d.dealValue, 0);
  }, [deals]);

  const activeRevenue = useMemo(() => {
    return deals
      .filter((d) => d.stage === "Active")
      .reduce((sum, d) => sum + d.dealValue, 0);
  }, [deals]);

  function moveDeal(dealId: string, direction: "forward" | "backward") {
    setDeals(
      deals.map((deal) => {
        if (deal.id !== dealId) return deal;
        const currentIdx = stages.indexOf(deal.stage);
        const newIdx =
          direction === "forward" ? currentIdx + 1 : currentIdx - 1;
        if (newIdx < 0 || newIdx >= stages.length) return deal;
        return { ...deal, stage: stages[newIdx] };
      })
    );
  }

  function handleAddDeal() {
    const deal: PipelineDeal = {
      ...newDeal,
      id: String(Date.now()),
    };
    setDeals([...deals, deal]);
    setNewDeal({
      companyName: "",
      ownerName: "",
      phone: "",
      email: "",
      dealValue: 2400,
      stage: "Prospect",
      notes: "",
    });
    setAddDialogOpen(false);
  }

  function handleUpdateDeal(updated: PipelineDeal) {
    setDeals(deals.map((d) => (d.id === updated.id ? updated : d)));
    setSelectedDeal(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Client Pipeline
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {deals.length} total deals ·{" "}
            <span className="text-primary">
              ${totalPipelineValue.toLocaleString()}
            </span>{" "}
            in pipeline ·{" "}
            <span className="text-emerald-400">
              ${activeRevenue.toLocaleString()}/mo
            </span>{" "}
            active
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Deal
          </Button>
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add New Deal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={newDeal.companyName}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, companyName: e.target.value })
                    }
                    placeholder="Acme Roofing"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={newDeal.ownerName}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, ownerName: e.target.value })
                    }
                    placeholder="John Smith"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={newDeal.phone}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, phone: e.target.value })
                    }
                    placeholder="(555) 555-0100"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newDeal.email}
                    onChange={(e) =>
                      setNewDeal({ ...newDeal, email: e.target.value })
                    }
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deal Value ($/mo)</Label>
                  <Input
                    type="number"
                    value={newDeal.dealValue}
                    onChange={(e) =>
                      setNewDeal({
                        ...newDeal,
                        dealValue: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select
                    value={newDeal.stage}
                    onValueChange={(v) =>
                      setNewDeal({ ...newDeal, stage: v as PipelineStage })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newDeal.notes}
                  onChange={(e) =>
                    setNewDeal({ ...newDeal, notes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleAddDeal}
                disabled={!newDeal.companyName || !newDeal.ownerName}
              >
                Add Deal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kanban Board */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-2 px-2">
        {stages.map((stage) => {
          const stageDeals = dealsByStage[stage];
          const stageValue = stageDeals.reduce(
            (sum, d) => sum + d.dealValue,
            0
          );
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-72 lg:w-auto lg:flex-1 lg:min-w-[200px]"
            >
              {/* Stage Header */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${stageColors[stage].replace("text-", "bg-")}`}
                  />
                  <h3 className="text-sm font-semibold">{stage}</h3>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-secondary text-xs text-muted-foreground">
                    {stageDeals.length}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ${stageValue.toLocaleString()}
                </span>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[200px] rounded-lg bg-secondary/30 p-2">
                {stageDeals.map((deal) => (
                  <Card
                    key={deal.id}
                    className="border-border bg-card cursor-pointer transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                    onClick={() => setSelectedDeal(deal)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-sm leading-tight">
                          {deal.companyName}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`${stageBgColors[stage]} ${stageColors[stage]} border-0 text-[10px] px-1.5 py-0 ml-2 flex-shrink-0`}
                        >
                          ${deal.dealValue.toLocaleString()}/mo
                        </Badge>
                      </div>
                      <div className="space-y-1.5">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <User className="h-3 w-3" />
                          {deal.ownerName}
                        </p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {deal.phone}
                        </p>
                      </div>
                      {deal.notes && (
                        <p className="mt-2 text-xs text-muted-foreground/70 line-clamp-2">
                          {deal.notes}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          disabled={stages.indexOf(stage) === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveDeal(deal.id, "backward");
                          }}
                        >
                          <ChevronLeft className="h-3 w-3 mr-1" />
                          Back
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                          disabled={
                            stages.indexOf(stage) === stages.length - 1
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            moveDeal(deal.id, "forward");
                          }}
                        >
                          Next
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {stageDeals.length === 0 && (
                  <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                    No deals
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Deal Dialog */}
      <Dialog
        open={!!selectedDeal}
        onOpenChange={(open) => !open && setSelectedDeal(null)}
      >
        {selectedDeal && (
          <DialogContent className="max-w-lg bg-card border-border">
            <DialogHeader>
              <DialogTitle>{selectedDeal.companyName}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={selectedDeal.companyName}
                    onChange={(e) =>
                      setSelectedDeal({
                        ...selectedDeal,
                        companyName: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={selectedDeal.ownerName}
                    onChange={(e) =>
                      setSelectedDeal({
                        ...selectedDeal,
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
                    value={selectedDeal.phone}
                    onChange={(e) =>
                      setSelectedDeal({
                        ...selectedDeal,
                        phone: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={selectedDeal.email}
                    onChange={(e) =>
                      setSelectedDeal({
                        ...selectedDeal,
                        email: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Deal Value ($/mo)</Label>
                  <Input
                    type="number"
                    value={selectedDeal.dealValue}
                    onChange={(e) =>
                      setSelectedDeal({
                        ...selectedDeal,
                        dealValue: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stage</Label>
                  <Select
                    value={selectedDeal.stage}
                    onValueChange={(v) =>
                      setSelectedDeal({
                        ...selectedDeal,
                        stage: v as PipelineStage,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={selectedDeal.notes}
                  onChange={(e) =>
                    setSelectedDeal({
                      ...selectedDeal,
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
              <Button onClick={() => handleUpdateDeal(selectedDeal)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
