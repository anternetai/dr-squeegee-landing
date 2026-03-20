"use client"

import { useState, useEffect, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, MapPin, DoorOpen, Target, TrendingUp, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TerritoryMap } from "@/components/portal/the-move/territory-map"
import { DoorLogOverlay } from "@/components/portal/the-move/door-log-overlay"
import type { TerritoryDoor, DoorVisit } from "@/lib/the-move/types"

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"
const PROXIMITY_METERS = 20

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * 111000
  const dLng = (lng2 - lng1) * 111000 * Math.cos((lat1 * Math.PI) / 180)
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

export default function TerritoryDetailPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = use(params)
  const territoryName = decodeURIComponent(name)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [doors, setDoors] = useState<TerritoryDoor[]>([])

  // Logging state
  const [logMode, setLogMode] = useState<"idle" | "new" | "revisit">("idle")
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [selectedDoor, setSelectedDoor] = useState<TerritoryDoor | null>(null)

  // Door detail popup
  const [detailDoor, setDetailDoor] = useState<TerritoryDoor | null>(null)

  // Proximity prompt
  const [nearbyDoor, setNearbyDoor] = useState<TerritoryDoor | null>(null)
  const [nearbyCoords, setNearbyCoords] = useState<{ lat: number; lng: number } | null>(null)

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

  const fetchDoors = useCallback(async () => {
    const res = await fetch(`/api/portal/the-move/territory-doors?neighborhood=${encodeURIComponent(territoryName)}`)
    if (res.ok) setDoors(await res.json())
  }, [territoryName])

  useEffect(() => {
    if (!loading) fetchDoors()
  }, [loading, fetchDoors])

  // Map click handler — check proximity
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (logMode !== "idle") return

    // Check if near an existing door
    for (const door of doors) {
      const dist = distanceMeters(lat, lng, door.lat, door.lng)
      if (dist <= PROXIMITY_METERS) {
        setNearbyDoor(door)
        setNearbyCoords({ lat, lng })
        return
      }
    }

    // No nearby door — new door flow
    setPendingCoords({ lat, lng })
    setLogMode("new")
  }, [doors, logMode])

  // Door pin click — show detail
  const handleDoorClick = useCallback((door: TerritoryDoor) => {
    if (logMode !== "idle") return
    setDetailDoor(door)
  }, [logMode])

  // Complete new door log
  async function handleNewDoorComplete(visit: DoorVisit) {
    if (!pendingCoords) return

    // Create door
    const createRes = await fetch("/api/portal/the-move/territory-doors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        neighborhood: territoryName,
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
      }),
    })
    if (!createRes.ok) return

    const door = await createRes.json()

    // Add visit
    await fetch(`/api/portal/the-move/territory-doors/${door.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visit }),
    })

    setPendingCoords(null)
    setLogMode("idle")
    fetchDoors()
  }

  // Complete revisit
  async function handleRevisitComplete(visit: DoorVisit) {
    if (!selectedDoor) return

    await fetch(`/api/portal/the-move/territory-doors/${selectedDoor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visit }),
    })

    setSelectedDoor(null)
    setLogMode("idle")
    setDetailDoor(null)
    fetchDoors()
  }

  // Accept proximity prompt — revisit
  function handleAcceptNearby() {
    if (!nearbyDoor) return
    setSelectedDoor(nearbyDoor)
    setLogMode("revisit")
    setNearbyDoor(null)
    setNearbyCoords(null)
  }

  // Decline proximity prompt — new door
  function handleDeclineNearby() {
    if (!nearbyCoords) return
    setPendingCoords(nearbyCoords)
    setLogMode("new")
    setNearbyDoor(null)
    setNearbyCoords(null)
  }

  // Delete a door
  async function handleDeleteDoor(id: string) {
    await fetch(`/api/portal/the-move/territory-doors/${id}`, { method: "DELETE" })
    setDetailDoor(null)
    fetchDoors()
  }

  // Stats
  const totalDoors = doors.length
  const doorsAnswered = doors.filter((d) => d.visits.some((v) => v.answered)).length
  const doorsClosed = doors.filter((d) => d.status === "closed").length
  const closeRate = doorsAnswered > 0 ? Math.round((doorsClosed / doorsAnswered) * 100) : 0

  // Center on first door or Charlotte
  const mapCenter = doors.length > 0
    ? { lat: doors[0].lat, lng: doors[0].lng }
    : null

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center bg-black">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="mx-auto max-w-3xl p-4 pb-28 lg:pb-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <Link href="/portal/the-move/territories" className="text-stone-500 hover:text-stone-300">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-stone-100">{territoryName}</h1>
            <div className="flex items-center gap-3 text-xs text-stone-500">
              <span className="flex items-center gap-1">
                <MapPin className="size-3" />
                {totalDoors} doors
              </span>
              <span className="flex items-center gap-1">
                <DoorOpen className="size-3" />
                {doorsAnswered} answered
              </span>
              <span className="flex items-center gap-1">
                <Target className="size-3" />
                {closeRate}% close
              </span>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative">
          <TerritoryMap
            doors={doors}
            onMapClick={handleMapClick}
            onDoorClick={handleDoorClick}
            center={mapCenter}
          />

          {/* Proximity prompt */}
          {nearbyDoor && (
            <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border border-amber-700 bg-stone-900/95 p-4 backdrop-blur">
              <p className="text-center text-sm font-medium text-stone-300">
                Re-visit this door?
              </p>
              <p className="mt-1 text-center text-xs text-stone-500 capitalize">
                {nearbyDoor.status.replace("_", " ")} &middot; {nearbyDoor.total_visits} visit{nearbyDoor.total_visits !== 1 ? "s" : ""}
              </p>
              <div className="mt-3 flex justify-center gap-3">
                <Button
                  onClick={handleAcceptNearby}
                  className="h-10 w-28 bg-amber-600 hover:bg-amber-500 text-black font-bold"
                >
                  <RotateCcw className="mr-1 size-4" />
                  Re-visit
                </Button>
                <Button
                  onClick={handleDeclineNearby}
                  variant="outline"
                  className="h-10 w-28 border-stone-700 text-stone-300"
                >
                  New Door
                </Button>
              </div>
              <button
                type="button"
                onClick={() => { setNearbyDoor(null); setNearbyCoords(null) }}
                className="mt-2 w-full text-center text-xs text-stone-600"
              >
                Cancel
              </button>
            </div>
          )}

          {/* New door log overlay */}
          {logMode === "new" && pendingCoords && (
            <DoorLogOverlay
              onComplete={handleNewDoorComplete}
              onCancel={() => { setLogMode("idle"); setPendingCoords(null) }}
            />
          )}

          {/* Revisit log overlay */}
          {logMode === "revisit" && selectedDoor && (
            <DoorLogOverlay
              onComplete={handleRevisitComplete}
              onCancel={() => { setLogMode("idle"); setSelectedDoor(null) }}
              isRevisit
              doorInfo={`${selectedDoor.total_visits} prior visit${selectedDoor.total_visits !== 1 ? "s" : ""}`}
            />
          )}

          {/* Door detail popup */}
          {detailDoor && logMode === "idle" && (
            <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border border-stone-700 bg-stone-900/95 p-4 backdrop-blur">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-stone-200 capitalize">
                    {detailDoor.status.replace("_", " ")}
                  </p>
                  <p className="text-xs text-stone-500">
                    {detailDoor.total_visits} visit{detailDoor.total_visits !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteDoor(detailDoor.id)}
                    className="text-stone-600 hover:text-red-400"
                  >
                    <Trash2 className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDetailDoor(null)}
                    className="text-stone-500 hover:text-stone-300 text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Visit history */}
              <div className="max-h-32 space-y-2 overflow-y-auto mb-3">
                {[...detailDoor.visits].reverse().map((v, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="shrink-0 text-stone-600">{v.date}{v.time ? ` ${v.time}` : ""}</span>
                    <span className={
                      v.closed ? "text-green-400" :
                      v.not_interested ? "text-red-400" :
                      v.pitched ? "text-amber-400" :
                      v.answered ? "text-blue-400" :
                      "text-stone-500"
                    }>
                      {v.closed ? "Closed" :
                       v.not_interested ? "Not interested" :
                       v.pitched ? "Pitched" :
                       v.answered ? "Talked" :
                       "No answer"}
                    </span>
                    {v.notes && <span className="text-stone-500 truncate">{v.notes}</span>}
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setSelectedDoor(detailDoor)
                  setLogMode("revisit")
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-black font-bold"
              >
                <RotateCcw className="mr-2 size-4" />
                Knock Again
              </Button>
            </div>
          )}
        </div>

        {/* Tap hint */}
        {doors.length === 0 && logMode === "idle" && (
          <div className="mt-4 rounded-xl border border-stone-800 bg-stone-900/50 p-6 text-center">
            <TrendingUp className="mx-auto mb-2 size-6 text-stone-700" />
            <p className="text-sm text-stone-500">Tap the map to log your first door</p>
          </div>
        )}
      </div>
    </div>
  )
}
