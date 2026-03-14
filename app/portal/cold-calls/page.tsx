"use client"

import { use, Suspense, useState, useEffect, lazy } from "react"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Gauge, BarChart2, List, GitBranch } from "lucide-react"

// ─── Tab key stored in localStorage ───────────────────────────────────────────

const TAB_STORAGE_KEY = "cold-calls-active-tab"
type ActiveTab = "cockpit" | "stats" | "leads" | "pipeline"

const VALID_TABS: ActiveTab[] = ["cockpit", "stats", "leads", "pipeline"]

function isValidTab(v: string | null): v is ActiveTab {
  return VALID_TABS.includes(v as ActiveTab)
}

/**
 * Reads active tab from:
 *  1. URL ?tab= param (highest priority — enables deep-linking)
 *  2. localStorage (persists last-used tab across sessions)
 *  3. Default: "cockpit"
 *
 * When the user manually changes tabs, we update both localStorage and the URL
 * (replaceState so it doesn't pollute browser history).
 */
function useActiveTab(): [ActiveTab, (t: ActiveTab) => void] {
  const searchParams = useSearchParams()
  const router = useRouter()
  const urlTab = searchParams.get("tab")

  const [tab, setTab] = useState<ActiveTab>(() => {
    // URL param takes priority (evaluated once on mount)
    if (isValidTab(urlTab)) return urlTab
    // Fall back to localStorage
    try {
      const stored = localStorage.getItem(TAB_STORAGE_KEY)
      if (isValidTab(stored)) return stored
    } catch {}
    return "cockpit"
  })

  // If URL tab changes (e.g. back/forward nav), sync state
  useEffect(() => {
    if (isValidTab(urlTab) && urlTab !== tab) {
      setTab(urlTab)
    }
    // Only react to URL changes, not internal tab state changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlTab])

  const setAndSave = (t: ActiveTab) => {
    setTab(t)
    try {
      localStorage.setItem(TAB_STORAGE_KEY, t)
    } catch {}
    // Update URL without adding a history entry
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", t)
    router.replace(`/portal/cold-calls?${params.toString()}`, { scroll: false })
  }

  return [tab, setAndSave]
}

// ─── Lazy tab content components ───────────────────────────────────────────────

const CallCockpit = lazy(() =>
  import("@/components/portal/cold-calls/call-cockpit").then((m) => ({
    default: m.CallCockpit,
  }))
)

const DialerStats = lazy(() =>
  import("@/components/portal/cold-calls/dialer-stats").then((m) => ({
    default: m.DialerStats,
  }))
)

const DialerLeadsTable = lazy(() =>
  import("@/components/portal/cold-calls/dialer-leads-table").then((m) => ({
    default: m.DialerLeadsTable,
  }))
)

const CallbackPipeline = lazy(() =>
  import("@/components/portal/cold-calls/callback-pipeline").then((m) => ({
    default: m.CallbackPipeline,
  }))
)

// ─── Tab skeleton fallbacks ────────────────────────────────────────────────────

function TabFallback() {
  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-56 rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Content (auth-gated) ──────────────────────────────────────────────────────

function ColdCallsContent() {
  const { user } = use(PortalAuthContext)
  const [activeTab, setActiveTab] = useActiveTab()

  if (!user) return null
  if (user.role !== "admin") {
    redirect("/portal/dashboard")
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold">Cold Calls</h1>
        <p className="text-sm text-muted-foreground">
          {activeTab === "cockpit" && "Command center — dial, track, and close"}
          {activeTab === "stats" && "Performance metrics and trend analysis"}
          {activeTab === "leads" && "Browse and manage your lead database"}
          {activeTab === "pipeline" && "Scheduled callbacks and follow-ups"}
        </p>
      </div>

      {/* Tab bar */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as ActiveTab)}
      >
        <TabsList className="h-auto gap-1 rounded-xl border bg-card px-2 py-2 shadow-sm">
          <TabsTrigger
            value="cockpit"
            className="gap-1.5 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            <Gauge className="size-3.5" />
            Cockpit
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart2 className="size-3.5" />
            Stats
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-1.5">
            <List className="size-3.5" />
            Leads
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="gap-1.5">
            <GitBranch className="size-3.5" />
            Pipeline
          </TabsTrigger>
        </TabsList>

        {/* Cockpit tab — preserves existing CallCockpit component */}
        <TabsContent value="cockpit">
          <Suspense fallback={<CockpitFallback />}>
            <CallCockpit />
          </Suspense>
        </TabsContent>

        {/* Stats tab */}
        <TabsContent value="stats">
          <Suspense fallback={<TabFallback />}>
            <DialerStats />
          </Suspense>
        </TabsContent>

        {/* Leads tab */}
        <TabsContent value="leads">
          <Suspense fallback={<TabFallback />}>
            <DialerLeadsTable />
          </Suspense>
        </TabsContent>

        {/* Pipeline tab */}
        <TabsContent value="pipeline">
          <Suspense fallback={<TabFallback />}>
            <CallbackPipeline />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── Cockpit-specific fallback (matches existing skeleton shape) ───────────────

function CockpitFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[500px] rounded-xl" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ColdCallsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ColdCallsContent />
    </Suspense>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-64" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-[500px] rounded-xl" />
        <Skeleton className="h-[500px] rounded-xl" />
      </div>
    </div>
  )
}
