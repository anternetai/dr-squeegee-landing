"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Timer, Flame, Zap } from "lucide-react"

interface SessionData {
  id: string
  started_at: string
  dials_at_start: number
  status: string
}

interface SessionTrackerProps {
  todayDials: number
  onSessionChange: () => void
}

const AFFIRMATIONS = [
  "You're not selling. You're solving their biggest problem.",
  "Every no gets you closer to the next yes.",
  "They need you more than you need them.",
  "85 Jay St is waiting. Earn it.",
  "The person who dials the most wins. Period.",
  "You've done this before. You'll do it again.",
  "Fear is fuel. Use it.",
  "This call could change everything.",
  "Charlotte is temporary. Brooklyn is the plan.",
  "Nobody is outworking you today.",
  "One more dial. One more chance.",
  "Comfort is the enemy. Stay uncomfortable.",
  "You didn't come this far to only come this far.",
  "The bridge is built one call at a time.",
  "They're waiting for someone to call. Be that person.",
  "Rejection is redirection. Keep going.",
  "You're 1 demo away from changing the month.",
  "DUMBO or nothing. Make the call.",
  "The version of you in Brooklyn is watching. Make him proud.",
  "Pain is temporary. Regret is forever. Dial.",
]

const WARMUP_PROMPTS = [
  { label: "BREATHE", sub: "4 seconds in. 7 hold. 8 out.", duration: 8000 },
  { label: "STAND UP", sub: "Power pose. Chest up. Shoulders back.", duration: 6000 },
  { label: "SMILE", sub: "They can hear it in your voice.", duration: 5000 },
  { label: "REMEMBER WHY", sub: "85 Jay St. December 1st. Brooklyn.", duration: 6000 },
  { label: "YOU'RE READY", sub: "Let's go get it.", duration: 4000 },
]

export function SessionTracker({ todayDials, onSessionChange }: SessionTrackerProps) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [currentAffirmation, setCurrentAffirmation] = useState(0)
  const [isWarming, setIsWarming] = useState(false)
  const [warmupStep, setWarmupStep] = useState(0)
  const [ending, setEnding] = useState(false)
  const [starting, setStarting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const affirmationRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Check for active session on mount
  useEffect(() => {
    fetch("/api/portal/the-move/session?active=true")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.status === "active") {
          setSession(data)
        }
      })
  }, [])

  // Timer
  useEffect(() => {
    if (session) {
      const update = () => {
        const start = new Date(session.started_at).getTime()
        setElapsed(Math.floor((Date.now() - start) / 1000))
      }
      update()
      timerRef.current = setInterval(update, 1000)
      return () => { if (timerRef.current) clearInterval(timerRef.current) }
    } else {
      setElapsed(0)
    }
  }, [session])

  // Rotate affirmations every 20s during active session
  useEffect(() => {
    if (session) {
      setCurrentAffirmation(Math.floor(Math.random() * AFFIRMATIONS.length))
      affirmationRef.current = setInterval(() => {
        setCurrentAffirmation((prev) => (prev + 1) % AFFIRMATIONS.length)
      }, 20000)
      return () => { if (affirmationRef.current) clearInterval(affirmationRef.current) }
    }
  }, [session])

  // Warmup sequence
  const runWarmup = useCallback(async () => {
    setIsWarming(true)
    for (let i = 0; i < WARMUP_PROMPTS.length; i++) {
      setWarmupStep(i)
      await new Promise((resolve) => setTimeout(resolve, WARMUP_PROMPTS[i].duration))
    }
    setIsWarming(false)
    setWarmupStep(0)
  }, [])

  async function startSession() {
    setStarting(true)
    // Run warmup first
    await runWarmup()

    const res = await fetch("/api/portal/the-move/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      const data = await res.json()
      setSession(data)
      onSessionChange()
    }
    setStarting(false)
  }

  async function endSession() {
    setEnding(true)
    const res = await fetch("/api/portal/the-move/session", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    if (res.ok) {
      setSession(null)
      onSessionChange()
    }
    setEnding(false)
  }

  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60
  const sessionDials = todayDials - (session?.dials_at_start ?? todayDials)

  // Warmup overlay
  if (isWarming) {
    const prompt = WARMUP_PROMPTS[warmupStep]
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.2)_0%,_transparent_70%)]" />
        <div className="relative flex flex-col items-center justify-center px-6 py-16 text-center">
          {/* Step indicators */}
          <div className="mb-8 flex gap-2">
            {WARMUP_PROMPTS.map((_, i) => (
              <div
                key={i}
                className={`h-1 w-8 rounded-full transition-all duration-300 ${
                  i <= warmupStep ? "bg-amber-400" : "bg-stone-800"
                }`}
              />
            ))}
          </div>

          <p className="text-4xl font-black tracking-tight text-white md:text-5xl">
            {prompt.label}
          </p>
          <p className="mt-3 text-lg font-light text-amber-200/60">
            {prompt.sub}
          </p>

          {warmupStep === 0 && (
            <div className="mt-8 size-20 rounded-full border-2 border-amber-500/30 animate-pulse" />
          )}
        </div>
      </div>
    )
  }

  // Active session
  if (session) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        {/* Pulsing warm background */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/80 via-stone-950 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(245,158,11,0.12)_0%,_transparent_60%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

        <div className="relative px-6 py-6">
          {/* Status bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse" />
              <span className="text-[10px] font-bold tracking-[0.3em] text-emerald-400 uppercase">
                Session Live
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-stone-400">
              <Timer className="size-3.5" />
              <span className="font-mono text-lg font-black text-white tabular-nums">
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
          </div>

          {/* Session stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="rounded-xl border border-stone-800/30 bg-black/30 px-4 py-3 text-center">
              <p className="text-3xl font-black text-white">{sessionDials}</p>
              <p className="text-[9px] tracking-[0.2em] text-stone-500 uppercase">Session Dials</p>
            </div>
            <div className="rounded-xl border border-stone-800/30 bg-black/30 px-4 py-3 text-center">
              <p className="text-3xl font-black text-white">{todayDials}</p>
              <p className="text-[9px] tracking-[0.2em] text-stone-500 uppercase">Total Today</p>
            </div>
          </div>

          {/* Affirmation */}
          <div className="mb-6 rounded-xl border border-amber-500/10 bg-amber-500/5 px-5 py-4">
            <div className="flex items-start gap-3">
              <Flame className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-amber-200/80 leading-relaxed transition-all duration-500">
                {AFFIRMATIONS[currentAffirmation]}
              </p>
            </div>
          </div>

          {/* End session */}
          <Button
            onClick={endSession}
            disabled={ending}
            variant="outline"
            className="w-full h-12 border-stone-700 bg-stone-900/50 hover:bg-red-950/30 hover:border-red-500/30 text-stone-300 hover:text-red-400 font-bold tracking-wide uppercase transition-all"
          >
            <PhoneOff className="mr-2 size-4" />
            {ending ? "Ending..." : "End Session"}
          </Button>
        </div>
      </div>
    )
  }

  // Ready to start
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-black to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.05)_0%,_transparent_60%)]" />

      <div className="relative px-6 py-8 text-center">
        <div className="mb-4">
          <Zap className="mx-auto size-8 text-amber-500/40" />
        </div>
        <p className="text-[10px] font-bold tracking-[0.3em] text-stone-500 uppercase mb-2">
          Ready to dial?
        </p>
        <p className="text-xs text-stone-600 mb-6 max-w-xs mx-auto">
          Start a session to track your dials, time, and keep your head in the game with live reminders.
        </p>
        <Button
          onClick={startSession}
          disabled={starting}
          className="h-14 px-10 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-black text-base tracking-wide uppercase shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-all hover:shadow-[0_0_32px_rgba(245,158,11,0.4)]"
        >
          <Phone className="mr-2 size-4" />
          {starting ? "Getting Ready..." : "Start Session"}
        </Button>
      </div>
    </div>
  )
}
