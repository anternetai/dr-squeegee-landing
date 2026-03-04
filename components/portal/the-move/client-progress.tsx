"use client"

import { CLIENT_GOAL, PHASE_THRESHOLD } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"

interface ClientProgressProps {
  stats: MoveStats | null
}

export function ClientProgress({ stats }: ClientProgressProps) {
  const count = stats?.activeClients ?? 0
  const pct = Math.min(100, (count / CLIENT_GOAL) * 100)
  const thresholdPct = (PHASE_THRESHOLD / CLIENT_GOAL) * 100
  const revenuePerClient = 800
  const projectedRevenue = count * revenuePerClient

  return (
    <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
      <h3 className="mb-5 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
        Client Roster
      </h3>

      <div className="mb-4 flex items-baseline gap-3">
        <span className="text-5xl font-black tracking-tighter text-white">{count}</span>
        <span className="text-lg font-light text-stone-600">of {CLIENT_GOAL}</span>
      </div>

      {/* Progress bar with threshold marker */}
      <div className="relative mb-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-stone-800/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className="absolute top-0 h-2 w-0.5 bg-amber-300/60"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] tracking-wide text-stone-600 uppercase">
        <span>Start</span>
        <span className="text-amber-500/70">3 = green light</span>
        <span>{CLIENT_GOAL} = goal</span>
      </div>

      {/* Client list */}
      {stats?.clientNames && stats.clientNames.length > 0 && (
        <div className="mt-5 space-y-2">
          {stats.clientNames.map((name) => (
            <div key={name} className="flex items-center gap-3 rounded-lg border border-stone-800/30 bg-stone-900/30 px-3 py-2">
              <span className="size-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
              <span className="text-sm font-medium text-stone-300">{name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg border border-amber-500/10 bg-amber-500/5 px-4 py-2.5">
        <p className="text-xs text-stone-500">
          Projected monthly
          <span className="ml-2 text-base font-black text-amber-400">
            ${projectedRevenue.toLocaleString()}
          </span>
        </p>
      </div>
    </div>
  )
}
