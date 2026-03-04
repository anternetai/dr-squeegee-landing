"use client"

import { FUNNEL_TARGETS, CLIENT_GOAL, getWeeksUntilMove } from "@/lib/the-move/constants"
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

  const clientsNeeded = CLIENT_GOAL - clients
  const weeklyClientRate = demos > 0 ? demos / FUNNEL_TARGETS.demos : 0
  const weeksToGoal = weeklyClientRate > 0 ? Math.ceil(clientsNeeded / weeklyClientRate) : Infinity
  const weeksLeft = getWeeksUntilMove()
  const onTrack = weeksToGoal <= weeksLeft

  return (
    <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-5">
      <h3 className="mb-5 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
        The Math
      </h3>

      <div className="space-y-3">
        <FunnelRow label="Dials" actual={dials} target={FUNNEL_TARGETS.dials} />
        <FunnelArrow rate={`${convoRate}%`} />
        <FunnelRow label="Conversations" actual={convos} target={FUNNEL_TARGETS.conversations} />
        <FunnelArrow rate={`${demoRate}%`} />
        <FunnelRow label="Demos" actual={demos} target={FUNNEL_TARGETS.demos} />
        <FunnelArrow rate="~16.7%" />
        <FunnelRow label="Clients" actual={clients} target={CLIENT_GOAL} highlight />
      </div>

      <div className={cn(
        "mt-5 rounded-lg border px-4 py-3",
        weeksToGoal === Infinity
          ? "border-stone-800/30 bg-stone-900/30"
          : onTrack
            ? "border-emerald-500/20 bg-emerald-500/5"
            : "border-amber-500/20 bg-amber-500/5"
      )}>
        {weeksToGoal === Infinity ? (
          <p className="text-xs text-stone-500">Book a demo to see the projection</p>
        ) : (
          <div>
            <p className="text-xs text-stone-500">At current pace</p>
            <p className="mt-0.5 text-lg font-black text-white">
              {weeksToGoal} weeks <span className="text-sm font-normal text-stone-500">to {CLIENT_GOAL} clients</span>
            </p>
            <p className="text-[10px] text-stone-600">
              {weeksLeft} weeks remaining — {onTrack ? "on track" : "need to push harder"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}

function FunnelRow({ label, actual, target, highlight }: { label: string; actual: number; target: number; highlight?: boolean }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0
  return (
    <div className="flex items-center justify-between">
      <span className={`text-xs tracking-wide uppercase ${highlight ? "text-amber-400 font-bold" : "text-stone-400"}`}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className={`font-mono text-lg font-black ${highlight ? "text-amber-400" : "text-white"}`}>
          {actual}
        </span>
        <span className="text-xs text-stone-600">/ {target}</span>
        <span className="w-10 text-right text-[10px] font-mono text-stone-600">{pct}%</span>
      </div>
    </div>
  )
}

function FunnelArrow({ rate }: { rate: string }) {
  return (
    <div className="flex items-center gap-2 pl-2">
      <div className="h-4 w-px bg-stone-800" />
      <span className="text-[10px] font-mono text-stone-600">{rate}</span>
    </div>
  )
}
