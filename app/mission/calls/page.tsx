"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { mockCallLogs } from "@/lib/mock-data";
import { DailyCallLog } from "@/lib/types";
import {
  Plus,
  Phone,
  Target,
  TrendingUp,
  Users,
  CalendarCheck,
  BarChart3,
} from "lucide-react";

const DAILY_DIAL_TARGET = 240;

export default function CallsPage() {
  const [callLogs, setCallLogs] = useState<DailyCallLog[]>(mockCallLogs);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newLog, setNewLog] = useState({
    date: new Date().toISOString().split("T")[0],
    dials: "",
    contacts: "",
    conversations: "",
    demosBooked: "",
  });

  const todayLog = callLogs[0];
  const todayProgress = Math.min(
    (todayLog.dials / DAILY_DIAL_TARGET) * 100,
    100
  );

  const weeklyStats = useMemo(() => {
    const weekLogs = callLogs.slice(0, 5);
    const totals = weekLogs.reduce(
      (acc, log) => ({
        dials: acc.dials + log.dials,
        contacts: acc.contacts + log.contacts,
        conversations: acc.conversations + log.conversations,
        demosBooked: acc.demosBooked + log.demosBooked,
      }),
      { dials: 0, contacts: 0, conversations: 0, demosBooked: 0 }
    );
    return {
      ...totals,
      days: weekLogs.length,
      avgDials: Math.round(totals.dials / weekLogs.length),
      contactRate:
        totals.dials > 0
          ? ((totals.contacts / totals.dials) * 100).toFixed(1)
          : "0",
      bookingRate:
        totals.contacts > 0
          ? ((totals.demosBooked / totals.contacts) * 100).toFixed(1)
          : "0",
      conversationRate:
        totals.contacts > 0
          ? ((totals.conversations / totals.contacts) * 100).toFixed(1)
          : "0",
    };
  }, [callLogs]);

  const allTimeStats = useMemo(() => {
    const totals = callLogs.reduce(
      (acc, log) => ({
        dials: acc.dials + log.dials,
        contacts: acc.contacts + log.contacts,
        conversations: acc.conversations + log.conversations,
        demosBooked: acc.demosBooked + log.demosBooked,
      }),
      { dials: 0, contacts: 0, conversations: 0, demosBooked: 0 }
    );
    return {
      ...totals,
      days: callLogs.length,
      avgDials: Math.round(totals.dials / callLogs.length),
      contactRate:
        totals.dials > 0
          ? ((totals.contacts / totals.dials) * 100).toFixed(1)
          : "0",
      bookingRate:
        totals.contacts > 0
          ? ((totals.demosBooked / totals.contacts) * 100).toFixed(1)
          : "0",
    };
  }, [callLogs]);

  function handleAddLog() {
    const log: DailyCallLog = {
      id: String(Date.now()),
      date: newLog.date,
      dials: parseInt(newLog.dials) || 0,
      contacts: parseInt(newLog.contacts) || 0,
      conversations: parseInt(newLog.conversations) || 0,
      demosBooked: parseInt(newLog.demosBooked) || 0,
    };
    setCallLogs([log, ...callLogs]);
    setNewLog({
      date: new Date().toISOString().split("T")[0],
      dials: "",
      contacts: "",
      conversations: "",
      demosBooked: "",
    });
    setAddDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Cold Call Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track your daily dials, contacts, and demos booked
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> Log Calls
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md bg-card border-border">
            <DialogHeader>
              <DialogTitle>Log Daily Calls</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newLog.date}
                  onChange={(e) =>
                    setNewLog({ ...newLog, date: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dials</Label>
                  <Input
                    type="number"
                    value={newLog.dials}
                    onChange={(e) =>
                      setNewLog({ ...newLog, dials: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contacts</Label>
                  <Input
                    type="number"
                    value={newLog.contacts}
                    onChange={(e) =>
                      setNewLog({ ...newLog, contacts: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Conversations</Label>
                  <Input
                    type="number"
                    value={newLog.conversations}
                    onChange={(e) =>
                      setNewLog({ ...newLog, conversations: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Demos Booked</Label>
                  <Input
                    type="number"
                    value={newLog.demosBooked}
                    onChange={(e) =>
                      setNewLog({ ...newLog, demosBooked: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAddLog}>Save Log</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Today's Progress */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Today&apos;s Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-5xl font-bold tracking-tight">
                  {todayLog.dials}
                </p>
                <p className="text-sm text-muted-foreground">
                  of {DAILY_DIAL_TARGET} target dials
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-3xl font-bold ${
                    todayProgress >= 100
                      ? "text-emerald-400"
                      : todayProgress >= 75
                      ? "text-primary"
                      : todayProgress >= 50
                      ? "text-amber-400"
                      : "text-red-400"
                  }`}
                >
                  {Math.round(todayProgress)}%
                </p>
                <p className="text-xs text-muted-foreground">
                  {DAILY_DIAL_TARGET - todayLog.dials > 0
                    ? `${DAILY_DIAL_TARGET - todayLog.dials} remaining`
                    : "Target hit! 🎉"}
                </p>
              </div>
            </div>
            <div className="h-4 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  todayProgress >= 100
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                    : todayProgress >= 75
                    ? "bg-gradient-to-r from-primary to-emerald-400"
                    : todayProgress >= 50
                    ? "bg-gradient-to-r from-amber-500 to-primary"
                    : "bg-gradient-to-r from-red-500 to-amber-500"
                }`}
                style={{ width: `${Math.min(todayProgress, 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="text-center rounded-lg bg-secondary/50 p-3">
                <Phone className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{todayLog.dials}</p>
                <p className="text-xs text-muted-foreground">Dials</p>
              </div>
              <div className="text-center rounded-lg bg-secondary/50 p-3">
                <Users className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{todayLog.contacts}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
              <div className="text-center rounded-lg bg-secondary/50 p-3">
                <TrendingUp className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-2xl font-bold">{todayLog.conversations}</p>
                <p className="text-xs text-muted-foreground">Convos</p>
              </div>
              <div className="text-center rounded-lg bg-secondary/50 p-3">
                <CalendarCheck className="mx-auto h-4 w-4 text-emerald-400 mb-1" />
                <p className="text-2xl font-bold text-emerald-400">
                  {todayLog.demosBooked}
                </p>
                <p className="text-xs text-muted-foreground">Demos</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Rates */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Contact Rate
            </p>
            <p className="mt-2 text-3xl font-bold text-primary">
              {weeklyStats.contactRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {weeklyStats.contacts} / {weeklyStats.dials} dials
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Booking Rate
            </p>
            <p className="mt-2 text-3xl font-bold text-emerald-400">
              {weeklyStats.bookingRate}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {weeklyStats.demosBooked} / {weeklyStats.contacts} contacts
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Avg. Daily Dials
            </p>
            <p className="mt-2 text-3xl font-bold">{weeklyStats.avgDials}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Over {weeklyStats.days} days
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-card">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Weekly Demos
            </p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {weeklyStats.demosBooked}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Conversation rate: {weeklyStats.conversationRate}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Call Log Table */}
      <Card className="border-border bg-card overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5 text-primary" />
            Daily Call Log
          </CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Dials</TableHead>
                <TableHead className="text-right">Contacts</TableHead>
                <TableHead className="text-right">Conversations</TableHead>
                <TableHead className="text-right">Demos</TableHead>
                <TableHead className="text-right">Contact %</TableHead>
                <TableHead className="text-right">Booking %</TableHead>
                <TableHead>Progress</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {callLogs.map((log) => {
                const contactRate =
                  log.dials > 0
                    ? ((log.contacts / log.dials) * 100).toFixed(1)
                    : "0";
                const bookingRate =
                  log.contacts > 0
                    ? ((log.demosBooked / log.contacts) * 100).toFixed(1)
                    : "0";
                const progress = Math.min(
                  (log.dials / DAILY_DIAL_TARGET) * 100,
                  100
                );
                return (
                  <TableRow key={log.id} className="border-border">
                    <TableCell className="font-medium">
                      {new Date(log.date + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {log.dials}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {log.contacts}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {log.conversations}
                    </TableCell>
                    <TableCell className="text-right font-mono text-emerald-400">
                      {log.demosBooked}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {contactRate}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {bookingRate}%
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full ${
                              progress >= 100
                                ? "bg-emerald-400"
                                : progress >= 75
                                ? "bg-primary"
                                : "bg-amber-400"
                            }`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {Math.round(progress)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* All-Time Summary */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">All-Time Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                {allTimeStats.dials.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Dials</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{allTimeStats.contacts}</p>
              <p className="text-xs text-muted-foreground">Total Contacts</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">
                {allTimeStats.conversations}
              </p>
              <p className="text-xs text-muted-foreground">Conversations</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-400">
                {allTimeStats.demosBooked}
              </p>
              <p className="text-xs text-muted-foreground">Demos Booked</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {allTimeStats.contactRate}%
              </p>
              <p className="text-xs text-muted-foreground">Contact Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-400">
                {allTimeStats.bookingRate}%
              </p>
              <p className="text-xs text-muted-foreground">Booking Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
