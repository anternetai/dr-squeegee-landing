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
  const revenuePerClient = 800 // ~$800/mo avg (mix of $200/appt clients)
  const projectedRevenue = count * revenuePerClient

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        HFH Client Progress
      </h3>

      <div className="mb-3 flex items-end gap-2">
        <span className="text-4xl font-black text-white">{count}</span>
        <span className="mb-1 text-lg text-zinc-500">/ {CLIENT_GOAL} clients</span>
      </div>

      {/* Progress bar with markers */}
      <div className="relative mb-2">
        <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-orange-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {/* Phase threshold marker at 3 */}
        <div
          className="absolute top-0 h-3 w-0.5 bg-yellow-400"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-zinc-600">
        <span>0</span>
        <span className="text-yellow-500">3 = move threshold</span>
        <span>{CLIENT_GOAL} = stretch</span>
      </div>

      {/* Client list */}
      {stats?.clientNames && stats.clientNames.length > 0 && (
        <div className="mt-4 space-y-1">
          {stats.clientNames.map((name) => (
            <div key={name} className="flex items-center gap-2 text-sm text-zinc-300">
              <span className="size-1.5 rounded-full bg-green-500" />
              {name}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
        Projected: <span className="font-semibold text-zinc-200">${projectedRevenue.toLocaleString()}/mo</span> at {count} clients
      </div>
    </div>
  )
}
