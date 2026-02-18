"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { mockTasks, mockProjects } from "@/lib/mock-data";
import { Task, TaskStatus, TaskPriority } from "@/lib/types";
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  RefreshCw,
  Loader2,
  Plus,
} from "lucide-react";

const statusConfig: Record<
  TaskStatus,
  { icon: typeof Circle; color: string; bgColor: string }
> = {
  "Not started": {
    icon: Circle,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
  },
  "In progress": {
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
  },
  Done: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
  },
};

const priorityColors: Record<string, string> = {
  High: "bg-red-500/15 text-red-400 border-red-500/20",
  Medium: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  Low: "bg-blue-500/15 text-blue-400 border-blue-500/20",
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [notionSource, setNotionSource] = useState<string>("mock");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const emptyTask: Omit<Task, "id"> = {
    title: "",
    status: "Not started",
    dueDate: null,
    priority: null,
    projectId: null,
    source: "manual",
  };
  const [newTask, setNewTask] = useState(emptyTask);

  async function fetchNotionTasks() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (data.source === "notion" && data.tasks.length > 0) {
        const manualTasks = tasks.filter((t) => t.source === "manual");
        const notionTasks = data.tasks.map((t: Task) => ({ ...t, source: "notion" as const }));
        setTasks([...manualTasks, ...notionTasks]);
        setNotionSource("notion");
      } else if (data.source === "error") {
        setError(data.error);
        setNotionSource("mock");
      } else {
        setNotionSource("mock");
      }
    } catch {
      setError("Failed to fetch tasks from Notion");
      setNotionSource("mock");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotionTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch =
        !search || task.title.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        filterStatus === "all" || task.status === filterStatus;
      const matchesPriority =
        filterPriority === "all" ||
        task.priority === filterPriority ||
        (filterPriority === "none" && !task.priority);
      const matchesProject =
        filterProject === "all" ||
        task.projectId === filterProject ||
        (filterProject === "none" && !task.projectId);
      return matchesSearch && matchesStatus && matchesPriority && matchesProject;
    });
  }, [tasks, search, filterStatus, filterPriority, filterProject]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Not started": 0,
      "In progress": 0,
      Done: 0,
    };
    tasks.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1;
    });
    return counts;
  }, [tasks]);

  function isOverdue(task: Task) {
    if (!task.dueDate || task.status === "Done") return false;
    return new Date(task.dueDate + "T23:59:59") < new Date();
  }

  function isDueToday(task: Task) {
    if (!task.dueDate) return false;
    const today = new Date().toISOString().split("T")[0];
    return task.dueDate === today;
  }

  function getProjectName(projectId: string | null) {
    if (!projectId) return null;
    return mockProjects.find((p) => p.id === projectId);
  }

  function handleAddTask() {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
    };
    setTasks([task, ...tasks]);
    setNewTask(emptyTask);
    setAddDialogOpen(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tasks.length} tasks ·{" "}
            <span>
              Notion:{" "}
              <Badge variant="outline" className="ml-1 text-xs font-normal">
                {notionSource === "notion" ? "Connected" : "Mock Data"}
              </Badge>
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={fetchNotionTasks}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync Notion
          </Button>
          <Button className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-400">
                Notion sync unavailable
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {error}. Set NOTION_API_TOKEN in your .env.local file.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-3 gap-4">
        {(Object.keys(statusConfig) as TaskStatus[]).map((status) => {
          const config = statusConfig[status];
          const Icon = config.icon;
          return (
            <Card
              key={status}
              className={`border-border bg-card cursor-pointer transition-colors ${
                filterStatus === status ? "ring-1 ring-primary" : ""
              }`}
              onClick={() =>
                setFilterStatus(filterStatus === status ? "all" : status)
              }
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-lg ${config.bgColor}`}
                >
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {statusCounts[status] || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">{status}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="border-border bg-card">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Not started">Not started</SelectItem>
                <SelectItem value="In progress">In progress</SelectItem>
                <SelectItem value="Done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="none">No Priority</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                <SelectItem value="none">No Project</SelectItem>
                {mockProjects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${p.color}`} />
                      {p.name.length > 25 ? p.name.slice(0, 25) + "…" : p.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Task List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center text-muted-foreground">
              No tasks found matching your filters.
            </CardContent>
          </Card>
        ) : (
          filtered.map((task) => {
            const config = statusConfig[task.status];
            const Icon = config.icon;
            const overdue = isOverdue(task);
            const dueToday = isDueToday(task);
            const project = getProjectName(task.projectId);

            return (
              <Card
                key={task.id}
                className={`border-border bg-card transition-colors hover:bg-secondary/30 ${
                  task.status === "Done" ? "opacity-60" : ""
                }`}
              >
                <CardContent className="flex items-center gap-4 p-4">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0 ${config.bgColor}`}
                  >
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === "Done"
                          ? "line-through text-muted-foreground"
                          : ""
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {task.dueDate && (
                        <span
                          className={`text-xs ${
                            overdue
                              ? "text-red-400 font-medium"
                              : dueToday
                              ? "text-amber-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {overdue && "⚠ "}
                          {dueToday
                            ? "Due today"
                            : new Date(
                                task.dueDate + "T12:00:00"
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })}
                        </span>
                      )}
                      {project && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                          <span>·</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${project.color}`} />
                          {project.name.split(" ").slice(0, 3).join(" ")}
                        </span>
                      )}
                      {task.source === "notion" && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border text-muted-foreground/50">
                          Notion
                        </Badge>
                      )}
                    </div>
                  </div>

                  {task.priority && (
                    <Badge
                      variant="outline"
                      className={`${priorityColors[task.priority]} flex-shrink-0`}
                    >
                      {task.priority}
                    </Badge>
                  )}

                  <Badge
                    variant="outline"
                    className={`${config.bgColor} ${config.color} border-0 flex-shrink-0`}
                  >
                    {task.status}
                  </Badge>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Add Task Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Task Title</Label>
              <Input
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                placeholder="What needs to be done?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={newTask.status}
                  onValueChange={(v) => setNewTask({ ...newTask, status: v as TaskStatus })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Not started">Not started</SelectItem>
                    <SelectItem value="In progress">In progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={newTask.priority || "none"}
                  onValueChange={(v) =>
                    setNewTask({ ...newTask, priority: v === "none" ? null : (v as TaskPriority) })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Priority</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={newTask.dueDate || ""}
                  onChange={(e) =>
                    setNewTask({ ...newTask, dueDate: e.target.value || null })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={newTask.projectId || "none"}
                  onValueChange={(v) =>
                    setNewTask({ ...newTask, projectId: v === "none" ? null : v })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Project</SelectItem>
                    {mockProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${p.color}`} />
                          {p.name.length > 28 ? p.name.slice(0, 28) + "…" : p.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddTask} disabled={!newTask.title}>
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
