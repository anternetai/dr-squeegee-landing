"use client"

import { useState, useCallback } from "react"
import dynamic from "next/dynamic"
import { Button } from "@/components/ui/button"
import { Locate } from "lucide-react"
import type { GpsPin } from "@/lib/the-move/types"

const PIN_RESULTS = ["knocked", "opened", "pitched", "closed", "skip"] as const
const PIN_COLORS: Record<string, string> = {
  knocked: "#9ca3af",
  opened: "#60a5fa",
  pitched: "#f59e0b",
  closed: "#22c55e",
  skip: "#ef4444",
}

const LeafletMap = dynamic(() => import("./knock-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center rounded-xl border border-stone-800 bg-stone-900">
      <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
    </div>
  ),
})

interface KnockMapTabProps {
  pins: GpsPin[]
  onAddPin: (pin: GpsPin) => void
  onRemovePin: (index: number) => void
  historicalPins: GpsPin[]
  neighborhoodCenter: { lat: number; lng: number } | null
}

export function KnockMapTab({ pins, onAddPin, onRemovePin, historicalPins, neighborhoodCenter }: KnockMapTabProps) {
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [mapInstance, setMapInstance] = useState<any>(null)

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setPendingPin({ lat, lng })
  }, [])

  function handleSelectResult(result: GpsPin["result"]) {
    if (!pendingPin) return
    onAddPin({
      lat: pendingPin.lat,
      lng: pendingPin.lng,
      result,
      ts: new Date().toISOString(),
    })
    setPendingPin(null)
  }

  function handleLocateMe() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (mapInstance) {
          mapInstance.setView([pos.coords.latitude, pos.coords.longitude], 17)
        }
      },
      () => {},
      { enableHighAccuracy: true }
    )
  }

  return (
    <div className="relative">
      <LeafletMap
        pins={pins}
        historicalPins={historicalPins}
        pendingPin={pendingPin}
        onMapClick={handleMapClick}
        onRemovePin={onRemovePin}
        onMapReady={setMapInstance}
        neighborhoodCenter={neighborhoodCenter}
      />

      <Button
        variant="outline"
        size="icon"
        onClick={handleLocateMe}
        className="absolute top-3 right-3 z-[1000] bg-stone-900 border-stone-700 hover:bg-stone-800"
      >
        <Locate className="size-4 text-amber-400" />
      </Button>

      {pendingPin && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000] rounded-xl border border-stone-700 bg-stone-900/95 p-3 backdrop-blur">
          <p className="mb-2 text-center text-xs font-medium text-stone-400">What happened here?</p>
          <div className="flex justify-around gap-1">
            {PIN_RESULTS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSelectResult(r)}
                className="flex flex-col items-center gap-1 rounded-lg px-2 py-2 active:bg-stone-800"
              >
                <div
                  className="h-5 w-5 rounded-full border-2 border-white"
                  style={{ background: PIN_COLORS[r] }}
                />
                <span className="text-[10px] capitalize text-stone-300">{r}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPendingPin(null)}
            className="mt-2 w-full text-center text-xs text-stone-500"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {PIN_RESULTS.map((r) => (
          <div key={r} className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-full"
              style={{ background: PIN_COLORS[r] }}
            />
            <span className="text-[10px] capitalize text-stone-500">{r}</span>
          </div>
        ))}
        {historicalPins.length > 0 && (
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-stone-600 bg-stone-700 opacity-60" />
            <span className="text-[10px] text-stone-500">past</span>
          </div>
        )}
      </div>
    </div>
  )
}
