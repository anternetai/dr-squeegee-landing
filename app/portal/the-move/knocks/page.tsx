"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { KnockLogTab } from "@/components/portal/the-move/knock-log-tab"
import { KnockStatsTab } from "@/components/portal/the-move/knock-stats-tab"
import { KnockHistoryTab } from "@/components/portal/the-move/knock-history-tab"
import { KnockMapTab } from "@/components/portal/the-move/knock-map-tab"
import type { DoorKnockSession, DoorKnockNeighborhood, KnockStats, GpsPin } from "@/lib/the-move/types"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

const TABS = ["Log", "Stats", "History", "Map"] as const
type Tab = (typeof TABS)[number]

export default function DoorKnockPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>("Log")
  const [sessions, setSessions] = useState<DoorKnockSession[]>([])
  const [editSession, setEditSession] = useState<DoorKnockSession | null>(null)
  const [gpsPins, setGpsPins] = useState<GpsPin[]>([])
  const [neighborhoods, setNeighborhoods] = useState<DoorKnockNeighborhood[]>([])
  const [knockStats, setKnockStats] = useState<KnockStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

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

  const fetchSessions = useCallback(async (neighborhood?: string | null) => {
    const params = new URLSearchParams({ limit: "100" })
    if (neighborhood) params.set("neighborhood", neighborhood)
    const res = await fetch(`/api/portal/the-move/door-knocks?${params}`)
    if (res.ok) setSessions(await res.json())
  }, [])

  const fetchNeighborhoods = useCallback(async () => {
    const res = await fetch("/api/portal/the-move/knock-neighborhoods")
    if (res.ok) setNeighborhoods(await res.json())
  }, [])

  const fetchKnockStats = useCallback(async (neighborhood?: string | null) => {
    setStatsLoading(true)
    const params = new URLSearchParams()
    if (neighborhood) params.set("neighborhood", neighborhood)
    const url = `/api/portal/the-move/knock-stats${params.toString() ? `?${params}` : ""}`
    const res = await fetch(url)
    if (res.ok) setKnockStats(await res.json())
    setStatsLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => {
    if (!loading) {
      fetchSessions()
      fetchNeighborhoods()
      fetchKnockStats()
    }
  }, [loading, fetchSessions, fetchNeighborhoods, fetchKnockStats])

  // Re-fetch when filter changes
  useEffect(() => {
    if (!loading) {
      fetchSessions(activeFilter)
      fetchKnockStats(activeFilter)
    }
  }, [activeFilter, loading, fetchSessions, fetchKnockStats])

  // Used neighborhoods for filter pills
  const usedNeighborhoods = useMemo(
    () => [...new Set(sessions.map((s) => s.neighborhood))].sort(),
    [sessions]
  )

  // Historical pins from all sessions (flattened)
  const historicalPins = useMemo(
    () => sessions.flatMap((s) => (s.gps_pins || []).map((p) => ({ ...p }))),
    [sessions]
  )

  // Neighborhood center for map
  const neighborhoodCenter = useMemo(() => {
    if (!activeFilter) return null
    const nh = neighborhoods.find((n) => n.name === activeFilter)
    if (nh?.center_lat && nh?.center_lng) return { lat: nh.center_lat, lng: nh.center_lng }
    return null
  }, [activeFilter, neighborhoods])

  function handleSubmit(session: DoorKnockSession) {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.id === session.id)
      if (idx >= 0) {
        const updated = [...prev]
        updated[idx] = session
        return updated
      }
      return [session, ...prev]
    })
    setEditSession(null)
    setGpsPins([])
    fetchKnockStats(activeFilter)
  }

  function handleEdit(session: DoorKnockSession) {
    setEditSession(session)
    setGpsPins(session.gps_pins || [])
    setTab("Log")
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/portal/the-move/door-knocks/${id}`, { method: "DELETE" })
    if (res.ok) {
      setSessions((prev) => prev.filter((s) => s.id !== id))
      fetchKnockStats(activeFilter)
    }
  }

  function handleAddPin(pin: GpsPin) {
    setGpsPins((prev) => [...prev, pin])
  }

  function handleRemovePin(index: number) {
    setGpsPins((prev) => prev.filter((_, i) => i !== index))
  }

  function handleNeighborhoodCreated(nh: DoorKnockNeighborhood) {
    setNeighborhoods((prev) => [...prev, nh].sort((a, b) => a.name.localeCompare(b.name)))
  }

  function handleFilterToggle(nh: string) {
    setActiveFilter((prev) => (prev === nh ? null : nh))
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
      <div className="mx-auto max-w-lg px-4 pb-6 pt-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/portal/the-move"
            className="flex size-9 items-center justify-center rounded-full border border-stone-800 text-stone-400 hover:text-stone-200"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-stone-100">Door Knocks</h1>
            <p className="text-xs text-stone-500">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} logged
              {activeFilter && ` · ${activeFilter}`}
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mb-3 flex rounded-xl border border-stone-800 bg-stone-900/50 p-1">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-stone-500 active:bg-stone-800"
              }`}
            >
              {t}
              {t === "Map" && gpsPins.length > 0 && (
                <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-black">
                  {gpsPins.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Neighborhood filter pills */}
        {usedNeighborhoods.length > 1 && (
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveFilter(null)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !activeFilter
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  : "bg-stone-900 text-stone-500 border border-stone-800"
              }`}
            >
              All
            </button>
            {usedNeighborhoods.map((nh) => (
              <button
                key={nh}
                type="button"
                onClick={() => handleFilterToggle(nh)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFilter === nh
                    ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    : "bg-stone-900 text-stone-500 border border-stone-800"
                }`}
              >
                {nh}
              </button>
            ))}
          </div>
        )}

        {/* Tab content */}
        {tab === "Log" && (
          <KnockLogTab
            editSession={editSession}
            gpsPins={gpsPins}
            onSubmit={handleSubmit}
            onClearEdit={() => {
              setEditSession(null)
              setGpsPins([])
            }}
            neighborhoods={neighborhoods}
            onNeighborhoodCreated={handleNeighborhoodCreated}
          />
        )}
        {tab === "Stats" && (
          <KnockStatsTab
            stats={knockStats}
            loading={statsLoading}
            activeFilter={activeFilter}
          />
        )}
        {tab === "History" && (
          <KnockHistoryTab
            sessions={sessions}
            onEdit={handleEdit}
            onDelete={handleDelete}
            activeFilter={activeFilter}
            onClearFilter={() => setActiveFilter(null)}
          />
        )}
        {tab === "Map" && (
          <KnockMapTab
            pins={gpsPins}
            onAddPin={handleAddPin}
            onRemovePin={handleRemovePin}
            historicalPins={historicalPins}
            neighborhoodCenter={neighborhoodCenter}
          />
        )}
      </div>
    </div>
  )
}
