"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { TallyCounter } from "./tally-counter"
import { Check, ChevronsUpDown, Play, Square, Cloud, Loader2, X } from "lucide-react"
import type { DoorKnockSession, DoorKnockNeighborhood, GpsPin } from "@/lib/the-move/types"

const DRAFT_KEY = "knockDraft"
const TIMER_KEY = "knockTimerStart"

interface Draft {
  neighborhood: string
  street: string
  sessionDate: string
  weather: string
  knocked: number
  opened: number
  pitched: number
  closed: number
  revenue: string
  minutes: string
  notes: string
  savedAt: string
}

interface KnockLogTabProps {
  editSession: DoorKnockSession | null
  gpsPins: GpsPin[]
  onSubmit: (session: DoorKnockSession) => void
  onClearEdit: () => void
  neighborhoods: DoorKnockNeighborhood[]
  onNeighborhoodCreated: (nh: DoorKnockNeighborhood) => void
}

export function KnockLogTab({
  editSession,
  gpsPins,
  onSubmit,
  onClearEdit,
  neighborhoods,
  onNeighborhoodCreated,
}: KnockLogTabProps) {
  const today = new Date().toISOString().split("T")[0]

  const [neighborhood, setNeighborhood] = useState("")
  const [street, setStreet] = useState("")
  const [sessionDate, setSessionDate] = useState(today)
  const [weather, setWeather] = useState("")
  const [knocked, setKnocked] = useState(0)
  const [opened, setOpened] = useState(0)
  const [pitched, setPitched] = useState(0)
  const [closed, setClosed] = useState(0)
  const [revenue, setRevenue] = useState("")
  const [minutes, setMinutes] = useState("")
  const [notes, setNotes] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [comboOpen, setComboOpen] = useState(false)
  const [comboSearch, setComboSearch] = useState("")
  const [draftRestored, setDraftRestored] = useState(false)

  // Timer state
  const [timerStart, setTimerStart] = useState<number | null>(null)
  const [timerDisplay, setTimerDisplay] = useState("00:00")
  const [timerStopped, setTimerStopped] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Weather loading
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Initialize from edit or draft
  useEffect(() => {
    if (editSession) {
      setNeighborhood(editSession.neighborhood)
      setStreet(editSession.street || "")
      setSessionDate(editSession.session_date)
      setWeather(editSession.weather || "")
      setKnocked(editSession.doors_knocked)
      setOpened(editSession.doors_opened)
      setPitched(editSession.pitches_given)
      setClosed(editSession.jobs_closed)
      setRevenue(editSession.revenue_closed?.toString() || "")
      setMinutes(editSession.session_minutes?.toString() || "")
      setNotes(editSession.notes || "")
      return
    }

    // Restore draft if from today
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const draft: Draft = JSON.parse(saved)
        if (draft.savedAt === today) {
          setNeighborhood(draft.neighborhood || "")
          setStreet(draft.street || "")
          setSessionDate(draft.sessionDate || today)
          setWeather(draft.weather || "")
          setKnocked(draft.knocked || 0)
          setOpened(draft.opened || 0)
          setPitched(draft.pitched || 0)
          setClosed(draft.closed || 0)
          setRevenue(draft.revenue || "")
          setMinutes(draft.minutes || "")
          setNotes(draft.notes || "")
          setDraftRestored(true)
        } else {
          localStorage.removeItem(DRAFT_KEY)
        }
      }

      // Restore last neighborhood if no draft
      if (!saved) {
        const lastNh = localStorage.getItem("lastKnockNeighborhood")
        if (lastNh) setNeighborhood(lastNh)
      }
    } catch {}

    // Restore timer
    try {
      const ts = localStorage.getItem(TIMER_KEY)
      if (ts) {
        const start = Number(ts)
        if (start > 0) {
          setTimerStart(start)
          setTimerStopped(false)
        }
      }
    } catch {}
  }, [editSession, today])

  // Timer tick
  useEffect(() => {
    if (timerStart && !timerStopped) {
      function tick() {
        const elapsed = Math.floor((Date.now() - timerStart!) / 1000)
        const m = Math.floor(elapsed / 60)
        const s = elapsed % 60
        setTimerDisplay(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`)
      }
      tick()
      timerRef.current = setInterval(tick, 1000)
      return () => {
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }
  }, [timerStart, timerStopped])

  // Save draft on changes (debounced-ish via effect)
  useEffect(() => {
    if (editSession) return
    const draft: Draft = {
      neighborhood, street, sessionDate, weather,
      knocked, opened, pitched, closed,
      revenue, minutes, notes,
      savedAt: today,
    }
    // Only save if there's meaningful data
    if (knocked > 0 || opened > 0 || notes || street || revenue) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    }
  }, [neighborhood, street, sessionDate, weather, knocked, opened, pitched, closed, revenue, minutes, notes, editSession, today])

  // Funnel enforcement
  function handleKnocked(n: number) {
    setKnocked(n)
    if (opened > n) setOpened(n)
    if (pitched > n) setPitched(Math.min(pitched, n))
    if (closed > n) setClosed(Math.min(closed, n))
  }
  function handleOpened(n: number) {
    const capped = Math.min(n, knocked)
    setOpened(capped)
    if (pitched > capped) setPitched(capped)
    if (closed > capped) setClosed(Math.min(closed, capped))
  }
  function handlePitched(n: number) {
    const capped = Math.min(n, opened)
    setPitched(capped)
    if (closed > capped) setClosed(capped)
  }
  function handleClosed(n: number) {
    setClosed(Math.min(n, pitched))
  }

  // Timer controls
  function handleTimerToggle() {
    if (timerStart && !timerStopped) {
      // Stop
      setTimerStopped(true)
      if (timerRef.current) clearInterval(timerRef.current)
      const elapsed = Math.round((Date.now() - timerStart) / 60000)
      setMinutes(String(elapsed))
      localStorage.removeItem(TIMER_KEY)
    } else if (timerStopped) {
      // Reset and start new
      const now = Date.now()
      setTimerStart(now)
      setTimerStopped(false)
      setMinutes("")
      localStorage.setItem(TIMER_KEY, String(now))
    } else {
      // Start
      const now = Date.now()
      setTimerStart(now)
      setTimerStopped(false)
      localStorage.setItem(TIMER_KEY, String(now))
    }
  }

  // Weather auto-fill
  async function handleWeatherFetch() {
    if (!navigator.geolocation) return
    setWeatherLoading(true)
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      )
      const { latitude, longitude } = pos.coords
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weathercode&temperature_unit=fahrenheit`
      )
      if (!res.ok) throw new Error("Weather API error")
      const data = await res.json()
      const temp = Math.round(data.current.temperature_2m)
      const code = data.current.weathercode
      const desc = weatherCodeToText(code)
      setWeather(`${desc} ${temp}°F`)
    } catch {
      // Silent fallback
    } finally {
      setWeatherLoading(false)
    }
  }

  // Neighborhood combobox create
  async function handleCreateNeighborhood(name: string) {
    try {
      const res = await fetch("/api/portal/the-move/knock-neighborhoods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        const nh = await res.json()
        onNeighborhoodCreated(nh)
        setNeighborhood(name)
        setComboOpen(false)
        setComboSearch("")
      }
    } catch {}
  }

  async function handleSubmit() {
    if (!neighborhood) {
      setError("Pick a neighborhood")
      return
    }
    setError("")
    setSubmitting(true)

    const payload = {
      neighborhood,
      street: street || null,
      session_date: sessionDate,
      weather: weather || null,
      doors_knocked: knocked,
      doors_opened: opened,
      pitches_given: pitched,
      jobs_closed: closed,
      revenue_closed: Number(revenue) || 0,
      session_minutes: Number(minutes) || null,
      notes: notes || null,
      gps_pins: gpsPins.length > 0 ? gpsPins : null,
    }

    try {
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
        setError(data.error || "Failed to save")
        return
      }

      const session = await res.json()
      localStorage.setItem("lastKnockNeighborhood", neighborhood)
      localStorage.removeItem(DRAFT_KEY)
      localStorage.removeItem(TIMER_KEY)
      onSubmit(session)

      if (!editSession) {
        setStreet("")
        setWeather("")
        setKnocked(0)
        setOpened(0)
        setPitched(0)
        setClosed(0)
        setRevenue("")
        setMinutes("")
        setNotes("")
        setTimerStart(null)
        setTimerStopped(false)
        setTimerDisplay("00:00")
      }
    } catch {
      setError("Network error")
    } finally {
      setSubmitting(false)
    }
  }

  const nhNames = neighborhoods.map((n) => n.name)
  const filteredNh = comboSearch
    ? nhNames.filter((n) => n.toLowerCase().includes(comboSearch.toLowerCase()))
    : nhNames
  const showCreate = comboSearch && !nhNames.some((n) => n.toLowerCase() === comboSearch.toLowerCase())

  return (
    <div className="space-y-6 px-1">
      {editSession && (
        <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
          <span className="text-sm text-amber-400">Editing session</span>
          <Button variant="ghost" size="sm" onClick={onClearEdit} className="text-stone-400 h-7">
            Cancel
          </Button>
        </div>
      )}

      {draftRestored && !editSession && (
        <div className="flex items-center justify-between rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2">
          <span className="text-xs text-blue-400">Draft restored</span>
          <button type="button" onClick={() => setDraftRestored(false)} className="text-stone-500">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Location & Date */}
      <div className="grid grid-cols-2 gap-3">
        {/* Neighborhood Combobox */}
        <Popover open={comboOpen} onOpenChange={setComboOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={comboOpen}
              className="justify-between bg-stone-900 border-stone-700 text-stone-200 hover:bg-stone-800 hover:text-stone-100 font-normal truncate"
            >
              <span className="truncate">{neighborhood || "Neighborhood"}</span>
              <ChevronsUpDown className="ml-1 size-3.5 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-0 bg-stone-900 border-stone-700" align="start">
            <Command className="bg-stone-900">
              <CommandInput
                placeholder="Search..."
                value={comboSearch}
                onValueChange={setComboSearch}
                className="text-stone-200"
              />
              <CommandList>
                <CommandEmpty className="text-stone-500 text-xs py-3">No neighborhood found</CommandEmpty>
                <CommandGroup>
                  {filteredNh.map((n) => (
                    <CommandItem
                      key={n}
                      value={n}
                      onSelect={() => {
                        setNeighborhood(n)
                        setComboOpen(false)
                        setComboSearch("")
                      }}
                      className="text-stone-200"
                    >
                      <Check className={`mr-2 size-3.5 ${neighborhood === n ? "opacity-100" : "opacity-0"}`} />
                      {n}
                    </CommandItem>
                  ))}
                  {showCreate && (
                    <CommandItem
                      onSelect={() => handleCreateNeighborhood(comboSearch.trim())}
                      className="text-amber-400"
                    >
                      + Create &ldquo;{comboSearch.trim()}&rdquo;
                    </CommandItem>
                  )}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Input
          placeholder="Street"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Input
          type="date"
          value={sessionDate}
          onChange={(e) => setSessionDate(e.target.value)}
          className="bg-stone-900 border-stone-700 text-stone-200"
        />
        <div className="relative flex gap-1">
          <Input
            placeholder="Weather"
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500 pr-9"
          />
          <button
            type="button"
            onClick={handleWeatherFetch}
            disabled={weatherLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-amber-400 transition-colors"
          >
            {weatherLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Cloud className="size-4" />
            )}
          </button>
        </div>
      </div>

      {/* Tally Counters */}
      <div className="flex justify-around py-4">
        <TallyCounter label="Knocked" value={knocked} onChange={handleKnocked} color="amber" />
        <TallyCounter label="Opened" value={opened} onChange={handleOpened} color="blue" />
        <TallyCounter label="Pitched" value={pitched} onChange={handlePitched} color="rose" />
        <TallyCounter label="Closed" value={closed} onChange={handleClosed} color="green" />
      </div>

      {/* Revenue & Timer */}
      <div className="grid grid-cols-2 gap-3">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
          <Input
            type="number"
            placeholder="Revenue"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            className="bg-stone-900 border-stone-700 text-stone-200 pl-7 placeholder:text-stone-500"
          />
        </div>
        <div className="flex gap-2 items-center">
          <button
            type="button"
            onClick={handleTimerToggle}
            className={`flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
              timerStart && !timerStopped
                ? "border-red-500/50 bg-red-500/10 text-red-400"
                : "border-stone-700 bg-stone-900 text-stone-400 hover:text-amber-400"
            }`}
          >
            {timerStart && !timerStopped ? (
              <Square className="size-4" />
            ) : (
              <Play className="size-4" />
            )}
          </button>
          {timerStart ? (
            <div className="flex-1 text-center">
              <span className="font-mono text-lg font-bold text-stone-200 tabular-nums">
                {timerDisplay}
              </span>
            </div>
          ) : (
            <Input
              type="number"
              placeholder="Minutes"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500"
            />
          )}
        </div>
      </div>

      <Textarea
        placeholder="Notes..."
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={3}
        className="bg-stone-900 border-stone-700 text-stone-200 placeholder:text-stone-500 resize-none"
      />

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-14 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-base tracking-wide uppercase shadow-[0_0_20px_rgba(245,158,11,0.3)] disabled:opacity-50"
      >
        {submitting ? "Saving..." : editSession ? "Update Session" : "Log It"}
      </Button>
    </div>
  )
}

function weatherCodeToText(code: number): string {
  if (code === 0) return "Clear"
  if (code <= 3) return "Cloudy"
  if (code <= 48) return "Foggy"
  if (code <= 57) return "Drizzle"
  if (code <= 65) return "Rain"
  if (code <= 67) return "Freezing Rain"
  if (code <= 77) return "Snow"
  if (code <= 82) return "Showers"
  if (code <= 86) return "Snow Showers"
  if (code >= 95) return "Thunderstorm"
  return "Sunny"
}
