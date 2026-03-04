"use client"

import { PHASES, getCurrentPhase } from "@/lib/the-move/constants"
import { cn } from "@/lib/utils"

export function PhaseTracker() {
  const current = getCurrentPhase()

  return (
    <div className="rounded-2xl border border-stone-800/50 bg-gradient-to-b from-stone-950 to-black p-6">
      <h2 className="mb-6 text-[10px] font-semibold tracking-[0.3em] text-stone-500 uppercase">
        The 9-Month Blueprint
      </h2>

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
                    "size-5 rounded-full border-2 shrink-0 transition-all",
                    isCompleted
                      ? "bg-amber-500 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                      : isCurrent
                        ? "border-amber-400 bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                        : "border-stone-700 bg-transparent"
                  )}
                />
                {i < PHASES.length - 1 && (
                  <div
                    className={cn(
                      "h-px w-full",
                      isCompleted ? "bg-amber-500/50" : "bg-stone-800"
                    )}
                  />
                )}
              </div>
              <div className="mt-3 pr-6">
                <p
                  className={cn(
                    "text-sm font-black tracking-tight",
                    isCurrent ? "text-amber-400" : isCompleted ? "text-stone-400" : "text-stone-600"
                  )}
                >
                  {phase.name}
                </p>
                <p className="mt-0.5 text-[10px] tracking-wide text-stone-600">
                  {new Date(phase.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  {" - "}
                  {new Date(phase.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                </p>
                <ul className="mt-2 space-y-1">
                  {phase.milestones.map((m) => (
                    <li key={m} className={cn(
                      "text-xs",
                      isCurrent ? "text-stone-400" : "text-stone-600"
                    )}>
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )
        })}
      </div>

      {/* Mobile: vertical timeline */}
      <div className="md:hidden space-y-0">
        {PHASES.map((phase, i) => {
          const isCompleted = phase.endDate < new Date().toISOString().split("T")[0]
          const isCurrent = phase.name === current.name
          return (
            <div key={phase.name} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "size-5 rounded-full border-2 shrink-0",
                    isCompleted
                      ? "bg-amber-500 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                      : isCurrent
                        ? "border-amber-400 bg-amber-500/20"
                        : "border-stone-700 bg-transparent"
                  )}
                />
                {i < PHASES.length - 1 && (
                  <div className={cn("w-px flex-1", isCompleted ? "bg-amber-500/50" : "bg-stone-800")} />
                )}
              </div>
              <div className="pb-6">
                <p className={cn(
                  "text-sm font-black tracking-tight",
                  isCurrent ? "text-amber-400" : isCompleted ? "text-stone-400" : "text-stone-600"
                )}>
                  {phase.name}
                </p>
                <p className="text-[10px] tracking-wide text-stone-600">
                  {new Date(phase.startDate + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}
                  {" - "}
                  {new Date(phase.endDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {phase.milestones.map((m) => (
                    <li key={m} className={cn("text-xs", isCurrent ? "text-stone-400" : "text-stone-600")}>
                      {m}
                    </li>
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
