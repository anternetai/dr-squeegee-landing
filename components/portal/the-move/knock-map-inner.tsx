"use client"

import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { GpsPin } from "@/lib/the-move/types"

const CHARLOTTE = { lat: 35.2271, lng: -80.8431 }

const PIN_COLORS: Record<string, string> = {
  knocked: "#9ca3af",
  opened: "#60a5fa",
  pitched: "#f59e0b",
  closed: "#22c55e",
  skip: "#ef4444",
}

function createIcon(color: string, opacity = 1) {
  return L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);opacity:${opacity};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e: { latlng: { lat: number; lng: number } }) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapReady({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => {
    onReady(map)
  }, [map, onReady])
  return null
}

function MapCenterUpdater({ center }: { center: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], 15)
    }
  }, [center, map])
  return null
}

interface Props {
  pins: GpsPin[]
  historicalPins?: GpsPin[]
  pendingPin: { lat: number; lng: number } | null
  onMapClick: (lat: number, lng: number) => void
  onRemovePin: (index: number) => void
  onMapReady: (map: L.Map) => void
  neighborhoodCenter?: { lat: number; lng: number } | null
}

export default function KnockMapInner({
  pins,
  historicalPins = [],
  pendingPin,
  onMapClick,
  onRemovePin,
  onMapReady,
  neighborhoodCenter,
}: Props) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-800" style={{ height: "60vh" }}>
      <MapContainer
        center={[CHARLOTTE.lat, CHARLOTTE.lng]}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler onClick={onMapClick} />
        <MapReady onReady={onMapReady} />
        {neighborhoodCenter && <MapCenterUpdater center={neighborhoodCenter} />}

        {/* Historical pins — faded, not removable */}
        {historicalPins.map((pin, i) => (
          <Marker
            key={`hist-${pin.lat}-${pin.lng}-${i}`}
            position={[pin.lat, pin.lng]}
            icon={createIcon(PIN_COLORS[pin.result || "knocked"], 0.4)}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold capitalize">{pin.result || "knocked"}</p>
                <p className="text-stone-500 text-xs">
                  {new Date(pin.ts).toLocaleDateString()}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Current session pins — full opacity, removable */}
        {pins.map((pin, i) => (
          <Marker
            key={`${pin.lat}-${pin.lng}-${i}`}
            position={[pin.lat, pin.lng]}
            icon={createIcon(PIN_COLORS[pin.result || "knocked"])}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold capitalize">{pin.result || "knocked"}</p>
                <p className="text-stone-500 text-xs">
                  {new Date(pin.ts).toLocaleTimeString()}
                </p>
                <button
                  type="button"
                  onClick={() => onRemovePin(i)}
                  className="mt-1 text-xs text-red-500 underline"
                >
                  Remove
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {pendingPin && (
          <Marker
            position={[pendingPin.lat, pendingPin.lng]}
            icon={createIcon("#ffffff")}
          />
        )}
      </MapContainer>
    </div>
  )
}
