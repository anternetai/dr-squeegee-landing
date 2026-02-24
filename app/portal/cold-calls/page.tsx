"use client"

import { use, Suspense, useState, useEffect } from "react"
import { redirect } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { ColdCallTracker } from "@/components/portal/cold-calls/cold-call-tracker"
import { CallCockpit } from "@/components/portal/cold-calls/call-cockpit"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LayoutDashboard, Gauge, Sparkles } from "lucide-react"

// ─── View toggle stored in localStorage ───────────────────────────────────────

const VIEW_STORAGE_KEY = "cold-calls-view-preference"
type ViewMode = "cockpit" | "classic"

function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [view, setView] = useState<ViewMode>("cockpit")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VIEW_STORAGE_KEY)
      if (stored === "classic" || stored === "cockpit") {
        setView(stored)
      }
    } catch {}
  }, [])

  const setAndSave = (v: ViewMode) => {
    setView(v)
    try {
      localStorage.setItem(VIEW_STORAGE_KEY, v)
    } catch {}
  }

  return [view, setAndSave]
}

// ─── View toggle bar ───────────────────────────────────────────────────────────

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode
  onChange: (v: ViewMode) => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 shadow-sm">
      <span className="mr-1 text-xs font-medium text-muted-foreground">View:</span>

      <Button
        variant={view === "cockpit" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("cockpit")}
        className={
          view === "cockpit"
            ? "gap-1.5 bg-orange-500 text-white hover:bg-orange-600"
            : "gap-1.5 text-muted-foreground hover:text-foreground"
        }
      >
        <Gauge className="size-3.5" />
        Cockpit
        {view === "cockpit" && (
          <Badge className="ml-0.5 bg-white/20 px-1 py-0 text-[9px] font-bold text-white">
            NEW
          </Badge>
        )}
      </Button>

      <Button
        variant={view === "classic" ? "default" : "ghost"}
        size="sm"
        onClick={() => onChange("classic")}
        className={
          view === "classic"
            ? "gap-1.5"
            : "gap-1.5 text-muted-foreground hover:text-foreground"
        }
      >
        <LayoutDashboard className="size-3.5" />
        Classic
      </Button>
    </div>
  )
}

// ─── Content (auth-gated) ──────────────────────────────────────────────────────

function ColdCallsContent() {
  const { user } = use(PortalAuthContext)
  const [view, setView] = useViewMode()

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-3">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cold Calls</h1>
          <p className="text-sm text-muted-foreground">
            {view === "cockpit" ? "Cockpit — command center view" : "Classic tracker view"}
          </p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {/* Render the selected view */}
      {view === "cockpit" ? <CallCockpit /> : <ColdCallTracker />}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ColdCallsPage() {
  return (
    <Suspense fallback={<ColdCallsSkeleton />}>
      <ColdCallsContent />
    </Suspense>
  )
}

function ColdCallsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-48" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[500px] rounded-xl" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}
