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
    <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
      <h3 className="mb-5 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
        PW Bridge Income
      </h3>

      <div className="mb-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-stone-800/30 bg-stone-900/30 px-3 py-3 text-center">
          <p className="text-2xl font-black text-white">{stats?.monthPWJobs ?? 0}</p>
          <p className="text-[10px] tracking-wide text-stone-600 uppercase">Jobs</p>
        </div>
        <div className="rounded-xl border border-stone-800/30 bg-stone-900/30 px-3 py-3 text-center">
          <p className="text-2xl font-black text-white">${stats?.monthPWRevenue?.toLocaleString() ?? "0"}</p>
          <p className="text-[10px] tracking-wide text-stone-600 uppercase">Revenue</p>
        </div>
        <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 px-3 py-3 text-center">
          <p className="text-2xl font-black text-amber-400">${WEEKLY_PW_REVENUE_TARGET}</p>
          <p className="text-[10px] tracking-wide text-stone-600 uppercase">Target/Wk</p>
        </div>
      </div>

      <h4 className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-stone-600 uppercase">
        Taper Schedule
      </h4>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800/50 text-left text-[10px] tracking-wide text-stone-600 uppercase">
              <th className="pb-2 pr-4">Clients</th>
              <th className="pb-2 pr-4">PW/Week</th>
              <th className="pb-2">Plan</th>
            </tr>
          </thead>
          <tbody>
            {TAPER_SCHEDULE.map((row) => (
              <tr
                key={row.clients}
                className={cn(
                  "border-b border-stone-900/50",
                  row.clients === currentClients && "bg-amber-500/5"
                )}
              >
                <td className={cn(
                  "py-2 pr-4 font-mono",
                  row.clients === currentClients ? "text-amber-400 font-bold" : "text-stone-400"
                )}>
                  {row.clients}
                </td>
                <td className={cn(
                  "py-2 pr-4 font-mono",
                  row.clients === currentClients ? "text-amber-400 font-bold" : "text-stone-400"
                )}>
                  {row.pwWeekly}
                </td>
                <td className={cn(
                  "py-2",
                  row.clients === currentClients ? "text-stone-300" : "text-stone-600"
                )}>
                  {row.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
