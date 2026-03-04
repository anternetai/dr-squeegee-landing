"use client"

import type { MoveStats } from "@/lib/the-move/types"
import {
  getCurrentPhase,
  getProgressPercent,
  MOVE_ADDRESS,
  MOVE_NEIGHBORHOOD,
} from "@/lib/the-move/constants"

interface MoveHeroProps {
  stats: MoveStats | null
}

export function MoveHero({ stats }: MoveHeroProps) {
  const phase = getCurrentPhase()
  const progress = getProgressPercent()

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Warm gradient background — Brooklyn sunset energy */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-950/90 via-stone-950 to-black" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.15)_0%,_transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(180,83,9,0.1)_0%,_transparent_50%)]" />

      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative px-6 py-8 md:px-10 md:py-12">
        {/* Phase badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5">
          <span className="size-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-xs font-semibold tracking-[0.2em] text-amber-300 uppercase">
            Phase: {phase.name}
          </span>
        </div>

        {/* The big countdown */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-7xl font-black tracking-tighter text-white md:text-8xl lg:text-9xl">
              {stats?.daysUntilMove ?? "---"}
            </h1>
            <p className="mt-1 text-lg font-light tracking-wide text-amber-200/60">
              days until everything changes
            </p>
          </div>

          <div className="text-left md:text-right">
            <p className="text-3xl font-black tracking-tight text-white md:text-4xl">
              {MOVE_ADDRESS}
            </p>
            <p className="mt-0.5 text-sm font-medium tracking-[0.3em] text-amber-400/80 uppercase">
              {MOVE_NEIGHBORHOOD}
            </p>
            <p className="text-xs tracking-[0.2em] text-stone-500 uppercase">
              December 1, 2026
            </p>
          </div>
        </div>

        {/* Progress bar — time elapsed */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] tracking-[0.2em] text-stone-500 uppercase">Charlotte</span>
            <span className="text-[10px] tracking-[0.2em] text-amber-500/70 uppercase">Brooklyn</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stat chips */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-stone-800/50 bg-black/30 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black text-white">{stats?.activeClients ?? 0}</p>
            <p className="text-[10px] tracking-[0.15em] text-stone-500 uppercase">Clients Signed</p>
          </div>
          <div className="rounded-xl border border-stone-800/50 bg-black/30 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black text-white">{stats?.todayDials ?? 0}</p>
            <p className="text-[10px] tracking-[0.15em] text-stone-500 uppercase">Dials Today</p>
          </div>
          <div className="rounded-xl border border-stone-800/50 bg-black/30 px-4 py-3 text-center backdrop-blur-sm">
            <p className="text-2xl font-black text-white">
              ${stats?.monthPWRevenue?.toLocaleString() ?? "0"}
            </p>
            <p className="text-[10px] tracking-[0.15em] text-stone-500 uppercase">PW This Month</p>
          </div>
        </div>
      </div>
    </div>
  )
}
