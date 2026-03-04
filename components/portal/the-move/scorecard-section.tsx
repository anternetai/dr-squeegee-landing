"use client"

import { WEEKLY_DIAL_TARGET, WEEKLY_KNOCK_TARGET, FUNNEL_TARGETS } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"

interface ScorecardProps {
  stats: MoveStats | null
}

function StatRow({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  const isHot = pct >= 80
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide text-stone-500 uppercase">{label}</span>
        <span className="font-mono text-sm font-bold text-stone-200">
          {value} <span className="text-stone-600 font-normal">/ {target}</span>
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-800/50">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isHot
              ? "bg-gradient-to-r from-amber-600 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]"
              : "bg-gradient-to-r from-stone-600 to-stone-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function ScorecardSection({ stats }: ScorecardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-lg">{'///'}</span>
          <h3 className="text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
            Cold Calls — This Week
          </h3>
        </div>
        <div className="space-y-4">
          <StatRow label="Dials" value={stats?.weekDials ?? 0} target={WEEKLY_DIAL_TARGET} />
          <StatRow label="Conversations" value={stats?.weekConversations ?? 0} target={FUNNEL_TARGETS.conversations} />
          <StatRow label="Demos Booked" value={stats?.weekDemos ?? 0} target={FUNNEL_TARGETS.demos} />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
        <div className="mb-5 flex items-center gap-2">
          <span className="text-lg">{'///'}</span>
          <h3 className="text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
            Door Knocks — This Week
          </h3>
        </div>
        <div className="space-y-4">
          <StatRow label="Doors Knocked" value={stats?.weekDoorsKnocked ?? 0} target={WEEKLY_KNOCK_TARGET} />
          <StatRow label="Doors Opened" value={stats?.weekDoorsOpened ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.3)} />
          <StatRow label="Pitches Given" value={stats?.weekPitchesGiven ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.15)} />
          <StatRow label="Jobs Closed" value={stats?.weekJobsClosed ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.05)} />
        </div>
      </div>
    </div>
  )
}
