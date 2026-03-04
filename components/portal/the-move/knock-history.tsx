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
      <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
        <h3 className="mb-3 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
          Knock Sessions
        </h3>
        <p className="text-sm text-stone-600 italic">No sessions logged yet. Go knock.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
      <h3 className="mb-5 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
        Knock Sessions
      </h3>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-800/50 text-left text-[10px] tracking-wide text-stone-600 uppercase">
              <th className="pb-2 pr-3">Date</th>
              <th className="pb-2 pr-3">Area</th>
              <th className="pb-2 pr-3 text-right">Knocked</th>
              <th className="pb-2 pr-3 text-right">Opened</th>
              <th className="pb-2 pr-3 text-right">Pitched</th>
              <th className="pb-2 pr-3 text-right">Closed</th>
              <th className="pb-2 pr-3 text-right">$</th>
              <th className="pb-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-stone-900/30 hover:bg-stone-900/20 transition-colors">
                <td className="py-2.5 pr-3 text-stone-500">
                  {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td className="py-2.5 pr-3 text-stone-300 font-medium">{s.neighborhood}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-stone-300">{s.doors_knocked}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-stone-300">{s.doors_opened}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-stone-300">{s.pitches_given}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-stone-300">{s.jobs_closed}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-amber-400">
                  {Number(s.revenue_closed) > 0 ? `$${Number(s.revenue_closed).toLocaleString()}` : "—"}
                </td>
                <td className="py-2.5">
                  <Button variant="ghost" size="icon" className="size-7 hover:bg-stone-800" onClick={() => onEdit(s)}>
                    <Pencil className="size-3 text-stone-600" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-xl border border-stone-800/30 bg-stone-900/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold text-stone-300">{s.neighborhood}</span>
                <span className="ml-2 text-[10px] text-stone-600">
                  {new Date(s.session_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </div>
              <Button variant="ghost" size="icon" className="size-7" onClick={() => onEdit(s)}>
                <Pencil className="size-3 text-stone-600" />
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="font-mono text-base font-black text-white">{s.doors_knocked}</p>
                <p className="text-[9px] tracking-wide text-stone-600 uppercase">Knocked</p>
              </div>
              <div>
                <p className="font-mono text-base font-black text-white">{s.doors_opened}</p>
                <p className="text-[9px] tracking-wide text-stone-600 uppercase">Opened</p>
              </div>
              <div>
                <p className="font-mono text-base font-black text-white">{s.pitches_given}</p>
                <p className="text-[9px] tracking-wide text-stone-600 uppercase">Pitched</p>
              </div>
              <div>
                <p className="font-mono text-base font-black text-white">{s.jobs_closed}</p>
                <p className="text-[9px] tracking-wide text-stone-600 uppercase">Closed</p>
              </div>
            </div>
            {Number(s.revenue_closed) > 0 && (
              <p className="mt-2 text-right font-mono text-sm font-bold text-amber-400">
                ${Number(s.revenue_closed).toLocaleString()}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
