"use client"

import { FUNNEL_TARGETS, CLIENT_GOAL } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"

interface ConversionFunnelProps {
  stats: MoveStats | null
}

export function ConversionFunnel({ stats }: ConversionFunnelProps) {
  const dials = stats?.weekDials ?? 0
  const convos = stats?.weekConversations ?? 0
  const demos = stats?.weekDemos ?? 0
  const clients = stats?.activeClients ?? 0

  const convoRate = dials > 0 ? ((convos / dials) * 100).toFixed(1) : "0"
  const demoRate = convos > 0 ? ((demos / convos) * 100).toFixed(1) : "0"

  // Weeks to goal
  const clientsNeeded = CLIENT_GOAL - clients
  const weeklyClientRate = demos > 0 ? demos / FUNNEL_TARGETS.demos : 0 // fraction of target demo pace
  const weeksToGoal = weeklyClientRate > 0 ? Math.ceil(clientsNeeded / weeklyClientRate) : Infinity

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">
        Conversion Funnel
      </h3>

      <div className="space-y-2">
        <FunnelRow label="Dials" actual={dials} target={FUNNEL_TARGETS.dials} />
        <div className="pl-4 text-xs text-zinc-600">↓ {convoRate}% conversion</div>
        <FunnelRow label="Conversations" actual={convos} target={FUNNEL_TARGETS.conversations} />
        <div className="pl-4 text-xs text-zinc-600">↓ {demoRate}% conversion</div>
        <FunnelRow label="Demos" actual={demos} target={FUNNEL_TARGETS.demos} />
        <div className="pl-4 text-xs text-zinc-600">↓ ~16.7% close rate</div>
        <FunnelRow label="Clients (total)" actual={clients} target={CLIENT_GOAL} />
      </div>

      <div className="mt-4 rounded-lg bg-zinc-900 px-3 py-2 text-sm text-zinc-400">
        {weeksToGoal === Infinity ? (
          "Need demo data to project timeline"
        ) : (
          <>At current pace: <span className="font-semibold text-orange-400">{weeksToGoal} weeks</span> to {CLIENT_GOAL} clients</>
        )}
      </div>
    </div>
  )
}

function FunnelRow({ label, actual, target }: { label: string; actual: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-300">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-sm text-white">{actual}</span>
        <span className="text-xs text-zinc-600">/ {target}</span>
        <span className="w-10 text-right text-xs font-mono text-zinc-500">{pct}%</span>
      </div>
    </div>
  )
}
