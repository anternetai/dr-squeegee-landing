"use client"

import { WEEKLY_PW_REVENUE_TARGET } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"
import { cn } from "@/lib/utils"

interface RevenueBridgeProps {
  stats: MoveStats | null
}

const TAPER_SCHEDULE = [
  { clients: 0, pwWeekly: "$1,500", note: "Full PW + knocking" },
  { clients: 1, pwWeekly: "$1,200", note: "Reduce to 4 days PW" },
  { clients: 2, pwWeekly: "$900", note: "3 days PW" },
  { clients: 3, pwWeekly: "$700", note: "2 days PW — move threshold hit" },
  { clients: 4, pwWeekly: "$500", note: "1-2 days PW" },
  { clients: 5, pwWeekly: "$300", note: "1 day PW" },
  { clients: 6, pwWeekly: "$0", note: "PW complete — full HFH" },
]

export function RevenueBridge({ stats }: RevenueBridgeProps) {
  const currentClients = stats?.activeClients ?? 0

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        PW Bridge Income
      </h3>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-lg bg-zinc-900 px-3 py-2 text-center">
          <p className="text-xl font-bold text-white">{stats?.monthPWJobs ?? 0}</p>
          <p className="text-xs text-zinc-500">Jobs This Month</p>
        </div>
        <div className="rounded-lg bg-zinc-900 px-3 py-2 text-center">
          <p className="text-xl font-bold text-white">${stats?.monthPWRevenue?.toLocaleString() ?? "0"}</p>
          <p className="text-xs text-zinc-500">Revenue This Month</p>
        </div>
        <div className="rounded-lg bg-zinc-900 px-3 py-2 text-center">
          <p className="text-xl font-bold text-white">${WEEKLY_PW_REVENUE_TARGET}</p>
          <p className="text-xs text-zinc-500">Weekly Target</p>
        </div>
      </div>

      <h4 className="mb-2 text-xs font-semibold text-zinc-500 uppercase">Taper Schedule</h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-1 pr-4">Clients</th>
              <th className="pb-1 pr-4">PW/Week</th>
              <th className="pb-1">Plan</th>
            </tr>
          </thead>
          <tbody>
            {TAPER_SCHEDULE.map((row) => (
              <tr
                key={row.clients}
                className={cn(
                  "border-b border-zinc-900",
                  row.clients === currentClients && "bg-orange-500/10"
                )}
              >
                <td className="py-1.5 pr-4 font-mono text-zinc-300">{row.clients}</td>
                <td className="py-1.5 pr-4 font-mono text-zinc-300">{row.pwWeekly}</td>
                <td className="py-1.5 text-zinc-500">{row.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
