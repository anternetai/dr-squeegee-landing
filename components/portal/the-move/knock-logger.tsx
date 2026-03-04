"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { NEIGHBORHOODS } from "@/lib/the-move/constants"
import type { DoorKnockSession } from "@/lib/the-move/types"

interface KnockLoggerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editSession?: DoorKnockSession | null
  onSubmit: (session: DoorKnockSession) => void
}

const WEATHER_OPTIONS = ["Sunny", "Cloudy", "Hot", "Cold", "Rainy", "Windy"]

export function KnockLogger({ open, onOpenChange, editSession, onSubmit }: KnockLoggerProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [neighborhood, setNeighborhood] = useState("")
  const [street, setStreet] = useState("")
  const [doorsKnocked, setDoorsKnocked] = useState("")
  const [doorsOpened, setDoorsOpened] = useState("")
  const [pitchesGiven, setPitchesGiven] = useState("")
  const [jobsClosed, setJobsClosed] = useState("")
  const [revenueClosed, setRevenueClosed] = useState("")
  const [sessionMinutes, setSessionMinutes] = useState("")
  const [weather, setWeather] = useState("")
  const [notes, setNotes] = useState("")
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split("T")[0])

  useEffect(() => {
    if (editSession) {
      setNeighborhood(editSession.neighborhood)
      setStreet(editSession.street || "")
      setDoorsKnocked(String(editSession.doors_knocked))
      setDoorsOpened(String(editSession.doors_opened))
      setPitchesGiven(String(editSession.pitches_given))
      setJobsClosed(String(editSession.jobs_closed))
      setRevenueClosed(String(editSession.revenue_closed))
      setSessionMinutes(editSession.session_minutes ? String(editSession.session_minutes) : "")
      setWeather(editSession.weather || "")
      setNotes(editSession.notes || "")
      setSessionDate(editSession.session_date)
    } else {
      const saved = localStorage.getItem("hfh_last_neighborhood")
      if (saved) setNeighborhood(saved)
    }
  }, [editSession])

  function resetForm() {
    const saved = localStorage.getItem("hfh_last_neighborhood")
    setNeighborhood(saved || "")
    setStreet("")
    setDoorsKnocked("")
    setDoorsOpened("")
    setPitchesGiven("")
    setJobsClosed("")
    setRevenueClosed("")
    setSessionMinutes("")
    setWeather("")
    setNotes("")
    setSessionDate(new Date().toISOString().split("T")[0])
    setError("")
  }

  async function handleSubmit() {
    setError("")
    if (!neighborhood) { setError("Neighborhood is required"); return }

    const knocked = Number(doorsKnocked) || 0
    const opened = Number(doorsOpened) || 0
    const pitched = Number(pitchesGiven) || 0
    const closed = Number(jobsClosed) || 0

    if (opened > knocked) { setError("Opened can't exceed knocked"); return }
    if (pitched > opened) { setError("Pitches can't exceed opened"); return }
    if (closed > pitched) { setError("Closed can't exceed pitches"); return }

    setSaving(true)
    try {
      const payload = {
        neighborhood,
        street: street || null,
        doors_knocked: knocked,
        doors_opened: opened,
        pitches_given: pitched,
        jobs_closed: closed,
        revenue_closed: Number(revenueClosed) || 0,
        session_minutes: Number(sessionMinutes) || null,
        weather: weather || null,
        notes: notes || null,
        session_date: sessionDate,
      }

      const url = editSession
        ? `/api/portal/the-move/door-knocks/${editSession.id}`
        : "/api/portal/the-move/door-knocks"
      const method = editSession ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save")
      }

      const data = await res.json()
      localStorage.setItem("hfh_last_neighborhood", neighborhood)
      onSubmit(data)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto bg-zinc-950 border-zinc-800">
        <SheetHeader>
          <SheetTitle className="text-white">
            {editSession ? "Edit Knock Session" : "Log Knock Session"}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-zinc-400">Neighborhood</Label>
              <Select value={neighborhood} onValueChange={setNeighborhood}>
                <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Select area..." />
                </SelectTrigger>
                <SelectContent>
                  {NEIGHBORHOODS.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-zinc-400">Street (optional)</Label>
              <Input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="e.g. 1200 block Providence"
                className="mt-1 bg-zinc-900 border-zinc-800"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Doors Knocked</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={doorsKnocked}
                onChange={(e) => setDoorsKnocked(e.target.value)}
                placeholder="0"
                className="mt-1 bg-zinc-900 border-zinc-800 text-lg h-12"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Doors Opened</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={doorsOpened}
                onChange={(e) => setDoorsOpened(e.target.value)}
                placeholder="0"
                className="mt-1 bg-zinc-900 border-zinc-800 text-lg h-12"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Pitches Given</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={pitchesGiven}
                onChange={(e) => setPitchesGiven(e.target.value)}
                placeholder="0"
                className="mt-1 bg-zinc-900 border-zinc-800 text-lg h-12"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Jobs Closed</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={jobsClosed}
                onChange={(e) => setJobsClosed(e.target.value)}
                placeholder="0"
                className="mt-1 bg-zinc-900 border-zinc-800 text-lg h-12"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Revenue ($)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={revenueClosed}
                onChange={(e) => setRevenueClosed(e.target.value)}
                placeholder="0"
                className="mt-1 bg-zinc-900 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Minutes</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={sessionMinutes}
                onChange={(e) => setSessionMinutes(e.target.value)}
                placeholder="60"
                className="mt-1 bg-zinc-900 border-zinc-800"
              />
            </div>

            <div>
              <Label className="text-zinc-400">Date</Label>
              <Input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="mt-1 bg-zinc-900 border-zinc-800"
              />
            </div>
            <div>
              <Label className="text-zinc-400">Weather</Label>
              <Select value={weather} onValueChange={setWeather}>
                <SelectTrigger className="mt-1 bg-zinc-900 border-zinc-800">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_OPTIONS.map((w) => (
                    <SelectItem key={w} value={w}>{w}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-zinc-400">Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any observations..."
                className="mt-1 bg-zinc-900 border-zinc-800"
                rows={2}
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base"
          >
            {saving ? "Saving..." : editSession ? "Update Session" : "Log Session"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
