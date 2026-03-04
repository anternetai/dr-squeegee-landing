"use client"

import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import type { DoorKnockSession } from "@/lib/the-move/types"

interface KnockHistoryProps {
  sessions: DoorKnockSession[]
  onEdit: (session: DoorKnockSession) => void
}

export function KnockHistory({ sessions, onEdit }: KnockHistoryProps) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h3 className="mb-2 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Recent Knock Sessions
        </h3>
        <p className="text-sm text-zinc-600">No sessions logged yet. Get out there!</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        Recent Knock Sessions
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-left text-xs text-zinc-500">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Neighborhood</th>
              <th className="pb-2 pr-3 text-right">Knocked</th>
              <th className="pb-2 pr-3 text-right">Opened</th>
              <th className="pb-2 pr-3 text-right">Pitched</th>
              <th className="pb-2 pr-3 text-right">Closed</th>
              <th className="pb-2 pr-3 text-right">Revenue</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-zinc-900">
                <td className="py-2 pr-3 text-zinc-400">
                  {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="py-2 pr-3 text-zinc-300">{s.neighborhood}</td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-300">{s.doors_knocked}</td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-300">{s.doors_opened}</td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-300">{s.pitches_given}</td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-300">{s.jobs_closed}</td>
                <td className="py-2 pr-3 text-right font-mono text-zinc-300">
                  {Number(s.revenue_closed) > 0 ? `$${Number(s.revenue_closed).toLocaleString()}` : "—"}
                </td>
                <td className="py-2">
                  <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(s)}>
                    <Pencil className="size-3.5 text-zinc-500" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-lg bg-zinc-900 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-medium text-zinc-300">{s.neighborhood}</span>
                <span className="ml-2 text-xs text-zinc-600">
                  {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(s)}>
                <Pencil className="size-3.5 text-zinc-500" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-mono text-sm text-zinc-200">{s.doors_knocked}</p>
                <p className="text-[10px] text-zinc-600">Knocked</p>
              </div>
              <div>
                <p className="font-mono text-sm text-zinc-200">{s.doors_opened}</p>
                <p className="text-[10px] text-zinc-600">Opened</p>
              </div>
              <div>
                <p className="font-mono text-sm text-zinc-200">{s.pitches_given}</p>
                <p className="text-[10px] text-zinc-600">Pitched</p>
              </div>
              <div>
                <p className="font-mono text-sm text-zinc-200">{s.jobs_closed}</p>
                <p className="text-[10px] text-zinc-600">Closed</p>
              </div>
            </div>
            {Number(s.revenue_closed) > 0 && (
              <p className="mt-1 text-xs text-green-400 text-right">${Number(s.revenue_closed).toLocaleString()}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
