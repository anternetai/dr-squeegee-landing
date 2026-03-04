"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

import { MoveHero } from "@/components/portal/the-move/move-hero"
import { PhaseTracker } from "@/components/portal/the-move/phase-tracker"
import { ScorecardSection } from "@/components/portal/the-move/scorecard-section"
import { ClientProgress } from "@/components/portal/the-move/client-progress"
import { RevenueBridge } from "@/components/portal/the-move/revenue-bridge"
import { KnockLogger } from "@/components/portal/the-move/knock-logger"
import { KnockHistory } from "@/components/portal/the-move/knock-history"
import { ConversionFunnel } from "@/components/portal/the-move/conversion-funnel"
import type { MoveStats } from "@/lib/the-move/types"
import type { DoorKnockSession } from "@/lib/the-move/types"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

export default function TheMovePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<MoveStats | null>(null)
  const [sessions, setSessions] = useState<DoorKnockSession[]>([])
  const [loggerOpen, setLoggerOpen] = useState(false)
  const [editSession, setEditSession] = useState<DoorKnockSession | null>(null)

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
    const [statsRes, sessionsRes] = await Promise.all([
      fetch("/api/portal/the-move/stats"),
      fetch("/api/portal/the-move/door-knocks?limit=20"),
    ])
    if (statsRes.ok) setStats(await statsRes.json())
    if (sessionsRes.ok) setSessions(await sessionsRes.json())
  }, [])

  useEffect(() => {
    if (!loading) fetchData()
  }, [loading, fetchData])

  function handleKnockSubmit(session: DoorKnockSession) {
    setSessions((prev) => {
      const exists = prev.findIndex((s) => s.id === session.id)
      if (exists >= 0) {
        const updated = [...prev]
        updated[exists] = session
        return updated
      }
      return [session, ...prev]
    })
    setEditSession(null)
    fetch("/api/portal/the-move/stats").then((r) => { if (r.ok) r.json().then(setStats) })
  }

  function handleEdit(session: DoorKnockSession) {
    setEditSession(session)
    setLoggerOpen(true)
  }

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
        <PhaseTracker />
        <ScorecardSection stats={stats} />

        <div className="grid gap-5 lg:grid-cols-2">
          <ClientProgress stats={stats} />
          <ConversionFunnel stats={stats} />
        </div>

        <RevenueBridge stats={stats} />
        <KnockHistory sessions={sessions} onEdit={handleEdit} />

        {/* Vision board footer */}
        <div className="pt-4 pb-2 text-center">
          <p className="text-[10px] tracking-[0.5em] text-stone-700 uppercase">
            Every dial gets you closer. Every door gets you closer. Do the work.
          </p>
        </div>
      </div>

      <KnockLogger
        open={loggerOpen}
        onOpenChange={(open) => {
          setLoggerOpen(open)
          if (!open) setEditSession(null)
        }}
        editSession={editSession}
        onSubmit={handleKnockSubmit}
      />

      {/* Mobile sticky trigger */}
      <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden bg-black/90 backdrop-blur-lg border-t border-stone-800/50">
        <Button
          onClick={() => setLoggerOpen(true)}
          className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-base tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        >
          Log Knock Session
        </Button>
      </div>
    </div>
  )
}
