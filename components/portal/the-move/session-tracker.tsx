"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Timer, Flame, Zap, X } from "lucide-react"

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

// ─── 5-MINUTE PRE-SESSION RITUAL ─────────────────────────────
// Total: ~5 minutes (300 seconds)
//
// Phase 1: BREATHING (90s) — 4 rounds of box breathing (4-4-4-4)
// Phase 2: VISUALIZATION (45s) — Close eyes, see the apartment, the life
// Phase 3: POWER UP (40s) — Stand, move, get blood flowing
// Phase 4: IDENTITY (50s) — Who you are, what you do, why it matters
// Phase 5: LOCK IN (45s) — Script reminder, first words ready
// Phase 6: COUNTDOWN (30s) — 10-9-8... you're live

type BreathPhase = "in" | "hold" | "out" | "rest"

interface WarmupPhase {
  id: string
  title: string
  duration: number // total ms for this phase
  type: "breathing" | "text" | "countdown"
  lines?: { text: string; sub?: string; hold?: number }[]
}

const WARMUP_PHASES: WarmupPhase[] = [
  {
    id: "breathing",
    title: "BREATHE",
    duration: 90000, // 90 seconds
    type: "breathing",
  },
  {
    id: "visualize",
    title: "VISUALIZE",
    duration: 45000,
    type: "text",
    lines: [
      { text: "Close your eyes.", sub: "Take a moment.", hold: 5000 },
      { text: "See the apartment.", sub: "85 Jay St. Your place. Your space.", hold: 7000 },
      { text: "See the Brooklyn Bridge\nfrom your window.", sub: "Morning coffee. The city below you.", hold: 8000 },
      { text: "See yourself there.", sub: "December 1st. You made it.", hold: 7000 },
      { text: "That life is real.", sub: "You're building it right now, with these calls.", hold: 8000 },
      { text: "Open your eyes.", sub: "Let's earn it.", hold: 5000 },
    ],
  },
  {
    id: "power",
    title: "POWER UP",
    duration: 40000,
    type: "text",
    lines: [
      { text: "Stand up.", sub: "Right now. On your feet.", hold: 5000 },
      { text: "Shoulders back.\nChest up.", sub: "Take up space. You belong here.", hold: 6000 },
      { text: "Shake your hands out.", sub: "Release the tension. Let it go.", hold: 6000 },
      { text: "Roll your neck.\nLoosen your jaw.", sub: "No tightness. Just flow.", hold: 6000 },
      { text: "Bounce on your toes.", sub: "Feel the energy. Wake up your body.", hold: 6000 },
      { text: "You're alive.\nYou're dangerous.", sub: "They don't know what's coming.", hold: 6000 },
    ],
  },
  {
    id: "identity",
    title: "IDENTITY",
    duration: 50000,
    type: "text",
    lines: [
      { text: "You are not begging.", sub: "You are offering a solution to a real problem.", hold: 7000 },
      { text: "These contractors need leads.", sub: "Their phone isn't ringing. You're the answer.", hold: 7000 },
      { text: "You charge $200\nper showed appointment.", sub: "No retainer. No risk for them. This is a no-brainer.", hold: 8000 },
      { text: "You've built the system.", sub: "AI qualification. Facebook ads. Automated booking. It works.", hold: 7000 },
      { text: "Every call you make\nis an act of service.", sub: "You're helping someone grow their business.", hold: 7000 },
      { text: "You are the hardest worker\nin the room.", sub: "Nobody wants this more than you.", hold: 7000 },
    ],
  },
  {
    id: "lockin",
    title: "LOCK IN",
    duration: 45000,
    type: "text",
    lines: [
      { text: "Smile.", sub: "They can hear it. It changes everything.", hold: 6000 },
      { text: "Your opener:", sub: "", hold: 3000 },
      { text: "\"Hey [NAME], this is\nAnthony with HomeField Hub—\"", sub: "Confident. Warm. Like you're calling a friend.", hold: 8000 },
      { text: "\"I help contractors like you\nget pre-qualified appointments\nwithout paying a retainer.\"", sub: "Pause. Let it land.", hold: 8000 },
      { text: "If they say no,\nyou say \"no problem.\"", sub: "And you dial the next one. That's it. That's the game.", hold: 7000 },
      { text: "Volume wins.\nSpeed wins.\nYou win.", sub: "Let's go.", hold: 7000 },
    ],
  },
  {
    id: "countdown",
    title: "GO TIME",
    duration: 30000,
    type: "countdown",
  },
]

export function SessionTracker({ todayDials, onSessionChange }: SessionTrackerProps) {
  const [session, setSession] = useState<SessionData | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [currentAffirmation, setCurrentAffirmation] = useState(0)
  const [isWarming, setIsWarming] = useState(false)
  const [warmupPhaseIdx, setWarmupPhaseIdx] = useState(0)
  const [warmupSubStep, setWarmupSubStep] = useState(0)
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("in")
  const [breathCount, setBreathCount] = useState(4)
  const [breathRound, setBreathRound] = useState(1)
  const [countdownNum, setCountdownNum] = useState(10)
  const [warmupElapsed, setWarmupElapsed] = useState(0)
  const [ending, setEnding] = useState(false)
  const [starting, setStarting] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const affirmationRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cancelRef = useRef(false)

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

  // Session timer
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

  // Warmup elapsed timer
  useEffect(() => {
    if (!isWarming) return
    const start = Date.now()
    const id = setInterval(() => setWarmupElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    return () => clearInterval(id)
  }, [isWarming])

  const sleep = (ms: number) => new Promise<void>((resolve) => {
    const check = () => {
      if (cancelRef.current) { resolve(); return }
      setTimeout(resolve, ms)
    }
    check()
  })

  // Breathing exercise: 4 rounds of box breathing (4-4-4-4 = 16s per round, ~64s + transitions)
  const runBreathing = useCallback(async () => {
    for (let round = 1; round <= 5; round++) {
      if (cancelRef.current) return
      setBreathRound(round)

      // Breathe in (4s)
      setBreathPhase("in")
      for (let i = 4; i >= 1; i--) {
        if (cancelRef.current) return
        setBreathCount(i)
        await sleep(1000)
      }

      // Hold (4s)
      setBreathPhase("hold")
      for (let i = 4; i >= 1; i--) {
        if (cancelRef.current) return
        setBreathCount(i)
        await sleep(1000)
      }

      // Breathe out (4s)
      setBreathPhase("out")
      for (let i = 4; i >= 1; i--) {
        if (cancelRef.current) return
        setBreathCount(i)
        await sleep(1000)
      }

      // Rest (2s between rounds)
      if (round < 5) {
        setBreathPhase("rest")
        await sleep(2000)
      }
    }
  }, [])

  // Text phase: cycle through lines
  const runTextPhase = useCallback(async (phase: WarmupPhase) => {
    if (!phase.lines) return
    for (let i = 0; i < phase.lines.length; i++) {
      if (cancelRef.current) return
      setWarmupSubStep(i)
      await sleep(phase.lines[i].hold || 5000)
    }
  }, [])

  // Countdown
  const runCountdown = useCallback(async () => {
    for (let i = 10; i >= 1; i--) {
      if (cancelRef.current) return
      setCountdownNum(i)
      await sleep(2000)
    }
    // Final moment
    setCountdownNum(0)
    await sleep(3000)
  }, [])

  const runWarmup = useCallback(async () => {
    cancelRef.current = false
    setIsWarming(true)
    setWarmupPhaseIdx(0)
    setWarmupSubStep(0)

    for (let i = 0; i < WARMUP_PHASES.length; i++) {
      if (cancelRef.current) break
      setWarmupPhaseIdx(i)
      setWarmupSubStep(0)
      const phase = WARMUP_PHASES[i]

      if (phase.type === "breathing") {
        await runBreathing()
      } else if (phase.type === "text") {
        await runTextPhase(phase)
      } else if (phase.type === "countdown") {
        await runCountdown()
      }
    }

    if (!cancelRef.current) {
      setIsWarming(false)
    }
  }, [runBreathing, runTextPhase, runCountdown])

  function cancelWarmup() {
    cancelRef.current = true
    setIsWarming(false)
    setStarting(false)
  }

  async function startSession() {
    setStarting(true)
    await runWarmup()

    if (cancelRef.current) {
      setStarting(false)
      return
    }

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

  async function skipToSession() {
    cancelRef.current = true
    setIsWarming(false)

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
  const warmupMins = Math.floor(warmupElapsed / 60)
  const warmupSecs = warmupElapsed % 60
  const totalWarmupSecs = 300

  // ─── WARMUP RENDER ──────────────────────────────────────
  if (isWarming) {
    const phase = WARMUP_PHASES[warmupPhaseIdx]
    const progressPct = Math.min(100, (warmupElapsed / totalWarmupSecs) * 100)

    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950 via-black to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(245,158,11,0.15)_0%,_transparent_70%)]" />

        <div className="relative px-6 py-10 md:py-16">
          {/* Top bar: phase progress + timer + skip */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.3em] text-amber-500/60 uppercase">
              {phase.title}
            </span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-stone-600">
                {warmupMins}:{String(warmupSecs).padStart(2, "0")} / 5:00
              </span>
              <button
                onClick={skipToSession}
                className="text-[10px] tracking-wide text-stone-600 hover:text-stone-400 uppercase transition-colors"
              >
                Skip
              </button>
              <button onClick={cancelWarmup} className="text-stone-700 hover:text-stone-400 transition-colors">
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* Phase progress bar */}
          <div className="mb-8">
            <div className="h-0.5 w-full overflow-hidden rounded-full bg-stone-800/50">
              <div
                className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between">
              {WARMUP_PHASES.map((p, i) => (
                <span
                  key={p.id}
                  className={`text-[8px] tracking-wider uppercase ${
                    i === warmupPhaseIdx ? "text-amber-400" : i < warmupPhaseIdx ? "text-stone-600" : "text-stone-800"
                  }`}
                >
                  {p.title}
                </span>
              ))}
            </div>
          </div>

          {/* BREATHING PHASE */}
          {phase.type === "breathing" && (
            <div className="flex flex-col items-center text-center">
              <p className="mb-2 text-[10px] tracking-[0.2em] text-stone-600 uppercase">
                Round {breathRound} of 5
              </p>

              {/* Animated breathing circle */}
              <div className="relative my-6 flex items-center justify-center">
                <div
                  className={`rounded-full border-2 transition-all duration-[3500ms] ease-in-out ${
                    breathPhase === "in"
                      ? "size-40 md:size-48 border-amber-400 bg-amber-500/10 shadow-[0_0_40px_rgba(245,158,11,0.2)]"
                      : breathPhase === "hold"
                        ? "size-40 md:size-48 border-amber-300 bg-amber-400/15 shadow-[0_0_50px_rgba(245,158,11,0.25)]"
                        : breathPhase === "out"
                          ? "size-20 md:size-24 border-amber-600/50 bg-amber-500/5"
                          : "size-20 md:size-24 border-stone-700 bg-transparent"
                  }`}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-3xl font-black text-white md:text-4xl">
                    {breathPhase === "rest" ? "..." : breathCount}
                  </p>
                </div>
              </div>

              <p className="text-2xl font-black tracking-tight text-white md:text-3xl">
                {breathPhase === "in" && "Breathe In"}
                {breathPhase === "hold" && "Hold"}
                {breathPhase === "out" && "Breathe Out"}
                {breathPhase === "rest" && "Rest"}
              </p>
              <p className="mt-2 text-sm text-amber-200/40">
                {breathPhase === "in" && "Fill your lungs completely. Deep into your belly."}
                {breathPhase === "hold" && "Hold it. Feel the stillness."}
                {breathPhase === "out" && "Slow and steady. Let everything go."}
                {breathPhase === "rest" && "Reset. Next round coming."}
              </p>
            </div>
          )}

          {/* TEXT PHASES (visualize, power, identity, lockin) */}
          {phase.type === "text" && phase.lines && (
            <div className="flex flex-col items-center text-center min-h-[200px] justify-center">
              <p className="whitespace-pre-line text-2xl font-black tracking-tight text-white leading-tight md:text-3xl">
                {phase.lines[warmupSubStep]?.text}
              </p>
              {phase.lines[warmupSubStep]?.sub && (
                <p className="mt-4 max-w-md text-base font-light text-amber-200/50 leading-relaxed">
                  {phase.lines[warmupSubStep].sub}
                </p>
              )}
            </div>
          )}

          {/* COUNTDOWN */}
          {phase.type === "countdown" && (
            <div className="flex flex-col items-center text-center min-h-[200px] justify-center">
              {countdownNum > 0 ? (
                <>
                  <p className="text-8xl font-black text-white md:text-9xl tabular-nums">
                    {countdownNum}
                  </p>
                  <p className="mt-4 text-sm tracking-[0.3em] text-amber-400/60 uppercase">
                    {countdownNum > 5 ? "Get ready" : countdownNum > 2 ? "Almost there" : "Here we go"}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-5xl font-black text-amber-400 md:text-6xl tracking-tight">
                    GO.
                  </p>
                  <p className="mt-3 text-lg text-amber-200/60">
                    Time to change your life.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── ACTIVE SESSION ──────────────────────────────────────
  if (session) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
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

  // ─── READY TO START ──────────────────────────────────────
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
          5-minute pre-session ritual: breathing, visualization, identity check, then go time.
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
