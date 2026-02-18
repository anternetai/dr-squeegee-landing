"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  CheckSquare,
  Activity,
  Building2,
  TrendingUp,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { mockProjects, mockTasks, mockSystems, mockPipelineDeals } from "@/lib/mock-data";

function useCurrentTime() {
  const [time, setTime] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    function update() {
      const now = new Date();
      const etOptions: Intl.DateTimeFormatOptions = {
        timeZone: "America/New_York",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      };
      const dateOptions: Intl.DateTimeFormatOptions = {
        timeZone: "America/New_York",
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      };
      setTime(now.toLocaleTimeString("en-US", etOptions) + " ET");
      setDate(now.toLocaleDateString("en-US", dateOptions));

      const hour = parseInt(
        now.toLocaleTimeString("en-US", {
          timeZone: "America/New_York",
          hour: "numeric",
          hour12: false,
        })
      );
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return { time, date, greeting };
}

export default function DashboardPage() {
  const { time, date, greeting } = useCurrentTime();

  const activeProjects = mockProjects.filter((p) => p.status === "Active").length;
  const tasksDueThisWeek = mockTasks.filter((t) => {
    if (!t.dueDate || t.status === "Done") return false;
    const due = new Date(t.dueDate + "T23:59:59");
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return due <= weekEnd;
  }).length;
  const systemsOk = mockSystems.filter((s) => s.health === "Operational").length;
  const systemsTotal = mockSystems.length;
  const systemsIssues = mockSystems.filter(
    (s) => s.health !== "Operational"
  );
  const activeClients = mockPipelineDeals.filter(
    (d) => d.stage === "Active"
  ).length;
  const activeRevenue = mockPipelineDeals
    .filter((d) => d.stage === "Active")
    .reduce((sum, d) => sum + d.dealValue, 0);

  const overdueTasks = mockTasks.filter((t) => {
    if (!t.dueDate || t.status === "Done") return false;
    return new Date(t.dueDate + "T23:59:59") < new Date();
  });

  const highPriorityTasks = mockTasks.filter(
    (t) => t.priority === "High" && t.status !== "Done"
  );

  const stats = [
    {
      label: "Active Projects",
      value: String(activeProjects),
      sub: `${mockProjects.filter((p) => p.status === "Planning").length} in planning`,
      icon: FolderKanban,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      href: "/projects",
    },
    {
      label: "Tasks Due",
      value: String(tasksDueThisWeek),
      sub: `${overdueTasks.length} overdue`,
      icon: CheckSquare,
      color: overdueTasks.length > 0 ? "text-amber-400" : "text-emerald-400",
      bgColor: overdueTasks.length > 0 ? "bg-amber-400/10" : "bg-emerald-400/10",
      href: "/tasks",
    },
    {
      label: "System Health",
      value: `${systemsOk}/${systemsTotal}`,
      sub: systemsIssues.length > 0 ? `${systemsIssues.length} need attention` : "All systems go",
      icon: Activity,
      color: systemsIssues.length > 0 ? "text-amber-400" : "text-emerald-400",
      bgColor: systemsIssues.length > 0 ? "bg-amber-400/10" : "bg-emerald-400/10",
      href: "/systems",
    },
    {
      label: "Active Clients",
      value: String(activeClients),
      sub: `$${activeRevenue.toLocaleString()}/mo MRR`,
      icon: Building2,
      color: "text-purple-400",
      bgColor: "bg-purple-400/10",
      href: "/pipeline",
    },
  ];

  const recentActivity = [
    { text: "VAPI outbound agent latency spiked — investigating", time: "15 min ago", type: "warning", link: "/systems" },
    { text: "n8n: Lead enrichment workflow completed 47 leads", time: "1 hour ago", type: "success", link: "/projects" },
    { text: "Demo booked with Precision Plumbing", time: "2 hours ago", type: "success", link: "/pipeline" },
    { text: "Meta campaign launched for BlueSky Solar", time: "3 hours ago", type: "info", link: "/projects" },
    { text: "187 dials completed today (78% of target)", time: "5 hours ago", type: "neutral", link: "/calls" },
    { text: "Coastal Concrete Coatings onboarding complete", time: "Yesterday", type: "success", link: "/pipeline" },
    { text: "Supabase RLS audit — 3 policies updated", time: "Yesterday", type: "info", link: "/projects" },
    { text: "Stripe auto-billing processed 3 invoices", time: "Feb 16", type: "success", link: "/systems" },
  ];

  const recentProjects = [...mockProjects]
    .filter((p) => p.status === "Active")
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {greeting}, Anthony
        </h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">{date} · {time}</span>
        </div>
      </div>

      {/* System Alert Banner (if issues) */}
      {systemsIssues.length > 0 && (
        <Link href="/mission/systems">
          <Card className="border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer">
            <CardContent className="flex items-center gap-3 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-400">
                  {systemsIssues.length} system{systemsIssues.length > 1 ? "s" : ""} need attention
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {systemsIssues.map((s) => s.name).join(", ")} — click to view details
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400" />
            </CardContent>
          </Card>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="border-border bg-card hover:bg-secondary/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                      {stat.sub}
                    </p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Active Projects (wider) */}
        <Card className="border-border bg-card lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Active Projects</CardTitle>
            <Link
              href="/mission/projects"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProjects.map((project) => (
              <Link key={project.id} href="/mission/projects" className="block">
                <div className="flex items-center gap-4 rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                  <div className={`h-2 w-2 rounded-full ${project.color} flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{project.name}</p>
                      <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                        {project.progress}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full ${project.color} transition-all duration-500`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] flex-shrink-0 border-border">
                    {project.category}
                  </Badge>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Priority Tasks */}
        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg">Priority Tasks</CardTitle>
            <Link
              href="/mission/tasks"
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {highPriorityTasks.slice(0, 6).map((task) => {
              const isOverdue =
                task.dueDate &&
                new Date(task.dueDate + "T23:59:59") < new Date();
              const project = mockProjects.find(
                (p) => p.id === task.projectId
              );
              return (
                <div
                  key={task.id}
                  className="flex items-start gap-3 rounded-lg p-2.5 hover:bg-secondary/50 transition-colors"
                >
                  <div
                    className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                      task.status === "In progress"
                        ? "bg-blue-400"
                        : "bg-gray-400"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm leading-snug">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {task.dueDate && (
                        <span
                          className={`text-xs ${
                            isOverdue
                              ? "text-red-400 font-medium"
                              : "text-muted-foreground"
                          }`}
                        >
                          {isOverdue ? "⚠ " : ""}
                          {new Date(task.dueDate + "T12:00:00").toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                      {project && (
                        <span className="text-xs text-muted-foreground/60">
                          · {project.name.split(" ").slice(0, 2).join(" ")}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-0 sm:grid-cols-2">
            {recentActivity.map((item, i) => (
              <Link key={i} href={item.link}>
                <div className="flex items-start gap-3 rounded-lg p-3 hover:bg-secondary/50 transition-colors">
                  <div
                    className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${
                      item.type === "success"
                        ? "bg-emerald-400"
                        : item.type === "warning"
                        ? "bg-amber-400"
                        : item.type === "info"
                        ? "bg-primary"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
