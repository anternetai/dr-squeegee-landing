"use client"

import { use, useEffect, useState, useCallback } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import {
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  RefreshCw,
  Cpu,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase/client"

interface AgentTask {
  id: string
  created_at: string
  updated_at: string
  task_name: string
  task_description: string | null
  status: "pending" | "running" | "completed" | "failed"
  progress: number
  current_step: string | null
  logs: LogEntry[]
  result: Record<string, unknown> | null
  error: string | null
  session_key: string | null
  started_at: string | null
  completed_at: string | null
}

interface LogEntry {
  time: string
  message: string
  type?: "info" | "success" | "error" | "warn"
}

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-muted-foreground",
    bg: "bg-muted",
    badge: "secondary" as const,
  },
  running: {
    label: "Running",
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    badge: "default" as const,
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    badge: "secondary" as const,
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    badge: "destructive" as const,
  },
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function duration(start: string | null, end: string | null): string {
  if (!start) return "—"
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const seconds = Math.floor((e - s) / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (minutes < 60) return `${minutes}m ${secs}s`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ${minutes % 60}m`
}

function TaskCard({ task }: { task: AgentTask }) {
  const [expanded, setExpanded] = useState(task.status === "running")
  const config = STATUS_CONFIG[task.status]
  const Icon = config.icon

  return (
    <Card className={`transition-all ${task.status === "running" ? "border-blue-500/30 shadow-sm shadow-blue-500/10" : ""}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
              <Icon className={`size-4 ${config.color} ${task.status === "running" ? "animate-spin" : ""}`} />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold leading-tight">{task.task_name}</CardTitle>
              {task.task_description && (
                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                  {task.task_description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant={config.badge} className="text-[10px]">
              {config.label}
            </Badge>
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {timeAgo(task.updated_at)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Bar */}
        {(task.status === "running" || task.status === "completed") && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {task.current_step || "Working..."}
              </span>
              <span className="tabular-nums font-medium">{task.progress}%</span>
            </div>
            <Progress value={task.progress} className="h-2" />
          </div>
        )}

        {/* Duration */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Duration: {duration(task.started_at, task.completed_at)}</span>
          {task.status === "running" && (
            <span className="flex items-center gap-1">
              <span className="relative flex size-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
              </span>
              Live
            </span>
          )}
        </div>

        {/* Error */}
        {task.error && (
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
            <p className="text-xs text-red-400">{task.error}</p>
          </div>
        )}

        {/* Result summary */}
        {task.result && task.status === "completed" && (
          <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <pre className="text-xs text-emerald-400 whitespace-pre-wrap">
              {typeof task.result === "string" ? task.result : JSON.stringify(task.result, null, 2)}
            </pre>
          </div>
        )}

        {/* Expandable Logs */}
        {task.logs && task.logs.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
            >
              {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
              Logs ({task.logs.length})
            </Button>
            {expanded && (
              <div className="mt-2 max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-2 font-mono text-[11px] space-y-0.5">
                {task.logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.time).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </span>
                    <span
                      className={
                        log.type === "error"
                          ? "text-red-400"
                          : log.type === "success"
                            ? "text-emerald-400"
                            : log.type === "warn"
                              ? "text-yellow-400"
                              : "text-foreground"
                      }
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompletedSection({ tasks }: { tasks: AgentTask[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-semibold text-emerald-500 uppercase tracking-wider hover:opacity-80 transition-opacity"
      >
        <CheckCircle2 className="size-4" />
        Completed ({tasks.length})
        {open ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>
      {open && (
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}

function ControlPanelContent() {
  const { user } = use(PortalAuthContext)
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/portal/admin/agent-tasks?limit=50")
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error("Failed to fetch tasks:", e)
    } finally {
      setLoading(false)
      setLastRefresh(Date.now())
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 5000) // poll every 5s
    return () => clearInterval(interval)
  }, [fetchTasks])

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("agent-tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agent_tasks" },
        () => {
          fetchTasks() // Refresh on any change
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTasks])

  const running = tasks.filter((t) => t.status === "running")
  const pending = tasks.filter((t) => t.status === "pending")
  const completed = tasks.filter((t) => t.status === "completed")
  const failed = tasks.filter((t) => t.status === "failed")

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Cpu className="size-6 text-orange-500" />
            Control Panel
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time sub-agent task monitoring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground tabular-nums">
            Updated {timeAgo(new Date(lastRefresh).toISOString())}
          </span>
          <Button variant="outline" size="sm" onClick={fetchTasks} className="gap-1.5">
            <RefreshCw className="size-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Activity className="size-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{running.length}</p>
              <p className="text-xs text-muted-foreground">Running</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Clock className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="size-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{completed.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-red-500/10">
              <XCircle className="size-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold tabular-nums">{failed.length}</p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Tasks */}
      {running.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
            </span>
            Running Now
          </h2>
          <div className="space-y-3">
            {running.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Queued
          </h2>
          <div className="space-y-3">
            {pending.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Completed — collapsible */}
      {completed.length > 0 && (
        <CompletedSection tasks={completed} />
      )}

      {/* Failed */}
      {failed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-500 uppercase tracking-wider">
            Failed
          </h2>
          <div className="space-y-3">
            {failed.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Cpu className="mb-4 size-12 text-muted-foreground/30" />
            <h3 className="text-lg font-semibold">No Tasks Yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When Mav launches sub-agents, their progress will appear here in real time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function ControlPage() {
  return <ControlPanelContent />
}
