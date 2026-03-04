"use client"

import { PHASES, getCurrentPhase } from "@/lib/the-move/constants"
import { cn } from "@/lib/utils"

export function PhaseTracker() {
  const current = getCurrentPhase()

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h2 className="mb-4 text-sm font-semibold text-zinc-400 uppercase tracking-wide">The 7-Month Plan</h2>

      {/* Desktop: horizontal */}
      <div className="hidden md:flex items-start gap-0">
        {PHASES.map((phase, i) => {
          const isCompleted = phase.endDate < new Date().toISOString().split("T")[0]
          const isCurrent = phase.name === current.name
          return (
            <div key={phase.name} className="flex-1 relative">
              <div className="flex items-center">
                <div
                  className={cn(
                    "size-4 rounded-full border-2 shrink-0",
                    isCompleted
                      ? "bg-orange-500 border-orange-500"
                      : isCurrent
                        ? "border-orange-500 bg-transparent"
                        : "border-zinc-700 bg-transparent"
                  )}
                />
                {i < PHASES.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-full",
                      isCompleted ? "bg-orange-500" : "bg-zinc-800"
                    )}
                  />
                )}
              </div>
              <div className="mt-2 pr-4">
                <p className={cn("text-sm font-bold", isCurrent ? "text-orange-400" : "text-zinc-300")}>
                  {phase.emoji} {phase.name}
                </p>
                <p className="text-xs text-zinc-600">
                  {new Date(phase.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  {" — "}
                  {new Date(phase.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {phase.milestones.map((m) => (
                    <li key={m} className="text-xs text-zinc-500">• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical */}
      <div className="md:hidden space-y-4">
        {PHASES.map((phase) => {
          const isCompleted = phase.endDate < new Date().toISOString().split("T")[0]
          const isCurrent = phase.name === current.name
          return (
            <div key={phase.name} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "size-4 rounded-full border-2 shrink-0",
                    isCompleted
                      ? "bg-orange-500 border-orange-500"
                      : isCurrent
                        ? "border-orange-500 bg-transparent"
                        : "border-zinc-700 bg-transparent"
                  )}
                />
                <div className={cn("w-0.5 flex-1 mt-1", isCompleted ? "bg-orange-500" : "bg-zinc-800")} />
              </div>
              <div className="pb-2">
                <p className={cn("text-sm font-bold", isCurrent ? "text-orange-400" : "text-zinc-300")}>
                  {phase.emoji} {phase.name}
                </p>
                <p className="text-xs text-zinc-600">
                  {new Date(phase.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  {" — "}
                  {new Date(phase.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                </p>
                <ul className="mt-1 space-y-0.5">
                  {phase.milestones.map((m) => (
                    <li key={m} className="text-xs text-zinc-500">• {m}</li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
