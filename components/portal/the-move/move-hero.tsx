"use client"

import type { MoveStats } from "@/lib/the-move/types"
import { getCurrentPhase } from "@/lib/the-move/constants"

interface MoveHeroProps {
  stats: MoveStats | null
}

export function MoveHero({ stats }: MoveHeroProps) {
  const phase = getCurrentPhase()

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 inline-block rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold tracking-wide text-orange-400 uppercase">
            {phase.emoji} Phase: {phase.name}
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">
            {stats?.daysUntilMove ?? "—"} <span className="text-zinc-400 text-2xl font-medium md:text-3xl">days</span>
          </h1>
          <p className="mt-1 text-sm text-zinc-500">until October 1, 2026</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold tracking-widest text-zinc-300 uppercase">
            90 Bedford St
          </p>
          <p className="font-mono text-xs tracking-widest text-zinc-500 uppercase">
            West Village — NYC
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4 border-t border-zinc-800 pt-4">
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats?.activeClients ?? 0}</p>
          <p className="text-xs text-zinc-500">Active Clients</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{stats?.todayDials ?? 0}</p>
          <p className="text-xs text-zinc-500">Dials Today</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-white">
            ${stats?.monthPWRevenue?.toLocaleString() ?? "0"}
          </p>
          <p className="text-xs text-zinc-500">PW This Month</p>
        </div>
      </div>
    </div>
  )
}
