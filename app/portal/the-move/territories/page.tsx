"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus, MapPin, Clock } from "lucide-react"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

interface TerritorySummary {
  name: string
  total_doors: number
  last_visited: string
}

export default function TerritoriesPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [territories, setTerritories] = useState<TerritorySummary[]>([])
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState("")

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

  const fetchTerritories = useCallback(async () => {
    const res = await fetch("/api/portal/the-move/territory-doors")
    if (res.ok) setTerritories(await res.json())
  }, [])

  useEffect(() => {
    if (!loading) fetchTerritories()
  }, [loading, fetchTerritories])

  function handleCreateTerritory() {
    const name = newName.trim()
    if (!name) return
    setShowNew(false)
    setNewName("")
    router.push(`/portal/the-move/territories/${encodeURIComponent(name)}`)
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
      <div className="mx-auto max-w-2xl space-y-4 p-4 pb-28 lg:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/portal/the-move" className="text-stone-500 hover:text-stone-300">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-stone-100">Territories</h1>
            <p className="text-xs text-stone-500">Per-door tracking by neighborhood</p>
          </div>
          <Button
            onClick={() => setShowNew(true)}
            size="sm"
            className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
          >
            <Plus className="mr-1 size-4" />
            New
          </Button>
        </div>

        {/* New Territory Input */}
        {showNew && (
          <div className="rounded-xl border border-stone-700 bg-stone-900 p-4">
            <p className="mb-2 text-sm font-medium text-stone-300">New Territory Name</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Providence Crossing"
                className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 text-sm text-stone-200 placeholder:text-stone-600 focus:border-amber-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreateTerritory()}
              />
              <Button
                onClick={handleCreateTerritory}
                size="sm"
                className="bg-amber-600 hover:bg-amber-500 text-black font-bold"
              >
                Go
              </Button>
              <Button
                onClick={() => { setShowNew(false); setNewName("") }}
                size="sm"
                variant="ghost"
                className="text-stone-500"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Territory Cards */}
        {territories.length === 0 && !showNew && (
          <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-8 text-center">
            <MapPin className="mx-auto mb-3 size-8 text-stone-700" />
            <p className="text-sm text-stone-500">No territories yet</p>
            <p className="mt-1 text-xs text-stone-600">Tap + to add your first neighborhood</p>
          </div>
        )}

        {territories.map((t) => (
          <Link
            key={t.name}
            href={`/portal/the-move/territories/${encodeURIComponent(t.name)}`}
            className="block rounded-xl border border-stone-800 bg-stone-900 p-4 transition hover:border-stone-700 active:bg-stone-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-stone-200">{t.name}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3" />
                    {t.total_doors} door{t.total_doors !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(t.last_visited).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <ArrowLeft className="size-4 rotate-180 text-stone-600" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
