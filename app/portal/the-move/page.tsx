"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { DoorOpen, MapPin, ArrowRight, Clock } from "lucide-react"

import { MoveHero } from "@/components/portal/the-move/move-hero"
import { SessionTracker } from "@/components/portal/the-move/session-tracker"
import { PhaseTracker } from "@/components/portal/the-move/phase-tracker"
import { ScorecardSection } from "@/components/portal/the-move/scorecard-section"
import { ClientProgress } from "@/components/portal/the-move/client-progress"
import { RevenueBridge } from "@/components/portal/the-move/revenue-bridge"
import { KnockHistory } from "@/components/portal/the-move/knock-history"
import { ConversionFunnel } from "@/components/portal/the-move/conversion-funnel"
import { InsightsCard } from "@/components/portal/the-move/insights-card"
import type { MoveStats, DoorKnockSession } from "@/lib/the-move/types"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

export default function TheMovePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MoveStats | null>(null)
  const [sessions, setSessions] = useState<DoorKnockSession[]>([])
  const [territories, setTerritories] = useState<{ name: string; total_doors: number; last_visited: string }[]>([])
  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.id !== ADMIN_ID) {
        router.push("/portal/dashboard")
        return
      }
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const fetchData = useCallback(async () => {
    const [statsRes, sessionsRes, terrRes] = await Promise.all([
      fetch("/api/portal/the-move/stats"),
      fetch("/api/portal/the-move/door-knocks?limit=20"),
      fetch("/api/portal/the-move/territory-doors"),
    ])
    if (statsRes.ok) setStats(await statsRes.json())
    if (sessionsRes.ok) setSessions(await sessionsRes.json())
    if (terrRes.ok) setTerritories(await terrRes.json())
  }, [])

  useEffect(() => {
    if (!loading) fetchData()
  }, [loading, fetchData])

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-black">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-5xl space-y-5 p-4 pb-28 lg:p-6 lg:pb-6">
        {/* Motivational header */}
        <div className="pt-2 pb-1">
          <p className="text-[10px] tracking-[0.4em] text-stone-600 uppercase">
            Charlotte to Brooklyn
          </p>
        </div>

        <MoveHero stats={stats} />

        {/* Session Tracker — right below the hero */}
        <SessionTracker
          todayDials={stats?.todayDials ?? 0}
          onSessionChange={fetchData}
        />

        <PhaseTracker />
        <ScorecardSection stats={stats} />

        <div className="grid gap-5 lg:grid-cols-2">
          <ClientProgress stats={stats} />
          <ConversionFunnel stats={stats} />
        </div>

        <RevenueBridge stats={stats} />
        <InsightsCard />
        <KnockHistory sessions={sessions} onEdit={() => router.push("/portal/the-move/knocks")} />

        {/* Territories Section */}
        <div className="rounded-xl border border-stone-800 bg-stone-900 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="size-5 text-amber-400" />
              <h2 className="font-bold text-stone-200">Territories</h2>
            </div>
            <Link
              href="/portal/the-move/territories"
              className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300"
            >
              View All <ArrowRight className="size-3" />
            </Link>
          </div>

          {territories.length === 0 ? (
            <Link
              href="/portal/the-move/territories"
              className="block rounded-lg border border-dashed border-stone-700 p-6 text-center hover:border-stone-600 transition"
            >
              <MapPin className="mx-auto mb-2 size-6 text-stone-700" />
              <p className="text-sm text-stone-500">No territories yet</p>
              <p className="mt-1 text-xs text-amber-500">Tap to start tracking doors by neighborhood</p>
            </Link>
          ) : (
            <div className="space-y-2">
              {territories.slice(0, 3).map((t) => (
                <Link
                  key={t.name}
                  href={`/portal/the-move/territories/${encodeURIComponent(t.name)}`}
                  className="flex items-center justify-between rounded-lg border border-stone-800 bg-stone-800/50 p-3 transition hover:border-stone-700 active:bg-stone-800"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-200">{t.name}</p>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span>{t.total_doors} door{t.total_doors !== 1 ? "s" : ""}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(t.last_visited).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-stone-600" />
                </Link>
              ))}
              {territories.length > 3 && (
                <p className="text-center text-xs text-stone-600">
                  +{territories.length - 3} more
                </p>
              )}
            </div>
          )}
        </div>

        {/* Log Session */}
        <div className="flex justify-center">
          <Button asChild className="h-14 px-8 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-base tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]">
            <Link href="/portal/the-move/knocks">
              <DoorOpen className="mr-2 size-5" />
              Log Session
            </Link>
          </Button>
        </div>

        {/* Vision board footer */}
        <div className="pt-4 pb-2 text-center">
          <p className="text-[10px] tracking-[0.5em] text-stone-700 uppercase">
            Every dial gets you closer. Every door gets you closer. Do the work.
          </p>
        </div>
      </div>
    </div>
  )
}
