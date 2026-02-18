"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockSystems } from "@/lib/mock-data";
import { ConnectedSystem, SystemHealth } from "@/lib/types";
import {
  Activity,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Database,
  Workflow,
  Mic,
  CreditCard,
  Phone,
  MessageSquare,
  BookOpen,
  Globe,
  Megaphone,
  Search,
  Loader2,
} from "lucide-react";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Database,
  Workflow,
  Mic,
  CreditCard,
  Phone,
  MessageSquare,
  BookOpen,
  Globe,
  Megaphone,
  Search,
};

const healthConfig: Record<
  SystemHealth,
  { icon: typeof CheckCircle2; color: string; bgColor: string; badgeClass: string; label: string }
> = {
  Operational: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    label: "Operational",
  },
  Degraded: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    label: "Degraded",
  },
  Down: {
    icon: XCircle,
    color: "text-red-400",
    bgColor: "bg-red-400/10",
    badgeClass: "bg-red-500/15 text-red-400 border-red-500/20",
    label: "Down",
  },
  Unknown: {
    icon: HelpCircle,
    color: "text-gray-400",
    bgColor: "bg-gray-400/10",
    badgeClass: "bg-gray-500/15 text-gray-400 border-gray-500/20",
    label: "Unknown",
  },
};

function timeAgo(isoString: string): string {
  const now = new Date();
  const then = new Date(isoString);
  const diffMs = now.getTime() - then.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function SystemsPage() {
  const [systems, setSystems] = useState<ConnectedSystem[]>(mockSystems);
  const [refreshing, setRefreshing] = useState(false);

  const healthCounts = useMemo(() => {
    const counts: Record<SystemHealth, number> = {
      Operational: 0,
      Degraded: 0,
      Down: 0,
      Unknown: 0,
    };
    systems.forEach((s) => {
      counts[s.health]++;
    });
    return counts;
  }, [systems]);

  const overallHealth: SystemHealth = useMemo(() => {
    if (healthCounts.Down > 0) return "Down";
    if (healthCounts.Degraded > 0) return "Degraded";
    if (healthCounts.Unknown > 0) return "Unknown";
    return "Operational";
  }, [healthCounts]);

  const overallConf = healthConfig[overallHealth];
  const OverallIcon = overallConf.icon;

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setSystems(
        systems.map((s) => ({
          ...s,
          lastChecked: new Date().toISOString(),
        }))
      );
      setRefreshing(false);
    }, 1500);
  }

  const sortedSystems = useMemo(() => {
    const order: Record<SystemHealth, number> = {
      Down: 0,
      Degraded: 1,
      Unknown: 2,
      Operational: 3,
    };
    return [...systems].sort((a, b) => order[a.health] - order[b.health]);
  }, [systems]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">Systems</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Health status of all connected services
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Check All
        </Button>
      </div>

      {/* Overall Status Banner */}
      <Card className={`border-border ${overallConf.bgColor}`}>
        <CardContent className="flex items-center gap-4 p-6">
          <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${overallConf.bgColor}`}>
            <OverallIcon className={`h-8 w-8 ${overallConf.color}`} />
          </div>
          <div className="flex-1">
            <p className={`text-lg font-bold ${overallConf.color}`}>
              {overallHealth === "Operational"
                ? "All Systems Operational"
                : overallHealth === "Degraded"
                ? "Some Systems Degraded"
                : overallHealth === "Down"
                ? "System Outage Detected"
                : "Some Systems Unknown"}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {healthCounts.Operational} operational · {healthCounts.Degraded} degraded · {healthCounts.Down} down · {healthCounts.Unknown} unknown
            </p>
          </div>
          <div className="flex gap-1">
            {systems.map((s) => (
              <div
                key={s.id}
                className={`h-8 w-2 rounded-full ${
                  s.health === "Operational"
                    ? "bg-emerald-400"
                    : s.health === "Degraded"
                    ? "bg-amber-400"
                    : s.health === "Down"
                    ? "bg-red-400"
                    : "bg-gray-400"
                }`}
                title={`${s.name}: ${s.health}`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Systems Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sortedSystems.map((system) => {
          const conf = healthConfig[system.health];
          const StatusIcon = conf.icon;
          const ServiceIcon = iconMap[system.icon] || Activity;
          return (
            <Card
              key={system.id}
              className={`border-border bg-card transition-all hover:shadow-lg ${
                system.health !== "Operational" ? "hover:shadow-amber-500/5" : "hover:shadow-primary/5"
              }`}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${conf.bgColor}`}>
                      <ServiceIcon className={`h-5 w-5 ${conf.color}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm">{system.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Checked {timeAgo(system.lastChecked)}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={conf.badgeClass}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {conf.label}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                  {system.description}
                </p>

                {system.error && (
                  <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3 mb-3">
                    <p className="text-xs text-red-400">{system.error}</p>
                  </div>
                )}

                <a
                  href={system.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Open Dashboard
                </a>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Uptime Overview */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-lg">Service Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {systems.map((system) => {
              const ServiceIcon = iconMap[system.icon] || Activity;
              return (
                <div
                  key={system.id}
                  className="flex items-center gap-4 rounded-lg p-3 hover:bg-secondary/30 transition-colors"
                >
                  <ServiceIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium flex-1">{system.name}</span>
                  <div className="flex items-center gap-8 text-xs text-muted-foreground">
                    <span className="hidden sm:block w-40 truncate">{system.description.split(".")[0]}</span>
                    <span className="w-20 text-right">{timeAgo(system.lastChecked)}</span>
                    <a
                      href={system.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    <div className={`h-2.5 w-2.5 rounded-full ${
                      system.health === "Operational"
                        ? "bg-emerald-400"
                        : system.health === "Degraded"
                        ? "bg-amber-400"
                        : system.health === "Down"
                        ? "bg-red-400"
                        : "bg-gray-400"
                    }`} />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
