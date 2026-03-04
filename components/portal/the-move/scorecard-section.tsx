"use client"

import { Progress } from "@/components/ui/progress"
import { WEEKLY_DIAL_TARGET, WEEKLY_KNOCK_TARGET, FUNNEL_TARGETS } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"

interface ScorecardProps {
  stats: MoveStats | null
}

function StatRow({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, Math.round((value / target) * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400">{label}</span>
        <span className="font-mono text-zinc-200">
          {value} <span className="text-zinc-600">/ {target}</span>
        </span>
      </div>
      <Progress value={pct} className="h-2 bg-zinc-800 [&>[data-slot=progress-indicator]]:bg-orange-500" />
    </div>
  )
}

export function ScorecardSection({ stats }: ScorecardProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Cold Calls — This Week
        </h3>
        <div className="space-y-3">
          <StatRow label="Dials" value={stats?.weekDials ?? 0} target={WEEKLY_DIAL_TARGET} />
          <StatRow label="Conversations" value={stats?.weekConversations ?? 0} target={FUNNEL_TARGETS.conversations} />
          <StatRow label="Demos Booked" value={stats?.weekDemos ?? 0} target={FUNNEL_TARGETS.demos} />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
        <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
          Door Knocks — This Week
        </h3>
        <div className="space-y-3">
          <StatRow label="Doors Knocked" value={stats?.weekDoorsKnocked ?? 0} target={WEEKLY_KNOCK_TARGET} />
          <StatRow label="Doors Opened" value={stats?.weekDoorsOpened ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.3)} />
          <StatRow label="Pitches Given" value={stats?.weekPitchesGiven ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.15)} />
          <StatRow label="Jobs Closed" value={stats?.weekJobsClosed ?? 0} target={Math.round(WEEKLY_KNOCK_TARGET * 0.05)} />
        </div>
      </div>
    </div>
  )
}
