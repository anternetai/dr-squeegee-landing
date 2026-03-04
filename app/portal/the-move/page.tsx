"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

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

export default function TheMoveePage() {
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
    // Optimistic: add/update in list, then refetch stats
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
    // Refetch stats to update scorecards
    fetch("/api/portal/the-move/stats").then((r) => { if (r.ok) r.json().then(setStats) })
  }

  function handleEdit(session: DoorKnockSession) {
    setEditSession(session)
    setLoggerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-24 lg:p-6 lg:pb-6">
      <MoveHero stats={stats} />
      <PhaseTracker />
      <ScorecardSection stats={stats} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ClientProgress stats={stats} />
        <ConversionFunnel stats={stats} />
      </div>

      <RevenueBridge stats={stats} />
      <KnockHistory sessions={sessions} onEdit={handleEdit} />

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
      <div className="fixed bottom-0 left-0 right-0 p-4 lg:hidden bg-zinc-950/90 backdrop-blur border-t border-zinc-800">
        <Button
          onClick={() => setLoggerOpen(true)}
          className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base"
        >
          <MapPin className="mr-2 size-4" />
          Log Knock Session
        </Button>
      </div>
    </div>
  )
}
