"use client"

import type { KnockStats } from "@/lib/the-move/types"
import { WEEKLY_KNOCK_TARGET } from "@/lib/the-move/constants"

interface KnockStatsTabProps {
  stats: KnockStats | null
  loading: boolean
  activeFilter: string | null
}

export function KnockStatsTab({ stats, loading, activeFilter }: KnockStatsTabProps) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="size-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
      </div>
    )
  }

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0)

  return (
    <div className="space-y-6 px-1">
      {activeFilter && (
        <p className="text-center text-xs text-amber-400/70">
          Filtered: {activeFilter}
        </p>
      )}

      {/* Today */}
      <Section title="Today">
        {stats.todaySessions === 0 ? (
          <p className="py-6 text-center text-sm text-stone-500">
            No knocks yet — go get it.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <BigStat value={stats.todayKnocked} label="Knocked" color="text-amber-400" />
              <BigStat value={stats.todayOpened} label="Opened" color="text-blue-400" />
              <BigStat value={stats.todayPitched} label="Pitched" color="text-rose-400" />
              <BigStat value={stats.todayClosed} label="Closed" color="text-green-400" />
            </div>
            <div className="mt-3 flex justify-center gap-2">
              <Pill label={`${pct(stats.todayOpened, stats.todayKnocked)}% open`} />
              <Pill label={`${pct(stats.todayPitched, stats.todayOpened)}% pitch`} />
              <Pill label={`${pct(stats.todayClosed, stats.todayPitched)}% close`} />
            </div>
            {stats.todayRevenue > 0 && (
              <p className="mt-2 text-center text-sm font-bold text-green-400">
                ${stats.todayRevenue.toLocaleString()} closed today
              </p>
            )}
          </>
        )}
      </Section>

      {/* This Week */}
      <Section title="This Week">
        <div className="grid grid-cols-4 gap-2 text-center">
          <CompactStat value={stats.weekKnocked} label="Knocked" color="text-amber-400" />
          <CompactStat value={stats.weekOpened} label="Opened" color="text-blue-400" />
          <CompactStat value={stats.weekPitched} label="Pitched" color="text-rose-400" />
          <CompactStat value={stats.weekClosed} label="Closed" color="text-green-400" />
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-stone-400 mb-1">
            <span>{stats.weekKnocked} / {WEEKLY_KNOCK_TARGET}</span>
            <span>{pct(stats.weekKnocked, WEEKLY_KNOCK_TARGET)}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all"
              style={{ width: `${Math.min(100, pct(stats.weekKnocked, WEEKLY_KNOCK_TARGET))}%` }}
            />
          </div>
        </div>
      </Section>

      {/* All Time */}
      <Section title="All Time">
        <div className="grid grid-cols-2 gap-3">
          <BigStat value={stats.allTimeKnocked} label="Knocked" color="text-amber-400" />
          <BigStat value={stats.allTimeOpened} label="Opened" color="text-blue-400" />
          <BigStat value={stats.allTimePitched} label="Pitched" color="text-rose-400" />
          <BigStat value={stats.allTimeClosed} label="Closed" color="text-green-400" />
        </div>
        <div className="mt-3 flex justify-center gap-4 text-xs text-stone-400">
          <span>{stats.allTimeSessions} sessions</span>
          {stats.allTimeRevenue > 0 && (
            <span className="text-green-400 font-semibold">
              ${stats.allTimeRevenue.toLocaleString()} revenue
            </span>
          )}
        </div>
      </Section>

      {/* Insights */}
      <Section title="Insights">
        <div className="space-y-3">
          {/* Streak */}
          <InsightRow
            icon={stats.currentStreak >= 7 ? "🔥" : "⚡"}
            glowing={stats.currentStreak >= 7}
          >
            <span className="font-bold text-stone-200">{stats.currentStreak} day streak</span>
            {stats.bestStreak > stats.currentStreak && (
              <span className="text-stone-500 text-xs ml-2">best: {stats.bestStreak}</span>
            )}
            {stats.currentStreak === 0 && (
              <span className="text-amber-400/70 text-xs ml-2">Keep it alive today</span>
            )}
          </InsightRow>

          {/* Best neighborhood */}
          {stats.bestNeighborhood && (
            <InsightRow icon="🏆">
              <span className="text-stone-200">
                Best: <span className="font-bold">{stats.bestNeighborhood}</span>
                {" — "}
                <span className="text-green-400">{stats.bestNeighborhoodCloseRate}% close rate</span>
              </span>
            </InsightRow>
          )}

          {/* Doors per hour */}
          {stats.avgDoorsPerHour !== null && (
            <InsightRow icon="⏱">
              <span className="text-stone-200">
                <span className="font-bold">{stats.avgDoorsPerHour}</span> doors/hour avg
              </span>
            </InsightRow>
          )}
        </div>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone-500">
        {title}
      </h3>
      {children}
    </div>
  )
}

function BigStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="rounded-lg bg-stone-800/50 p-3 text-center">
      <p className={`text-2xl font-black tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
    </div>
  )
}

function CompactStat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-stone-500">{label}</p>
    </div>
  )
}

function Pill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-stone-800 px-2.5 py-1 text-[11px] font-medium text-stone-300">
      {label}
    </span>
  )
}

function InsightRow({
  icon,
  glowing,
  children,
}: {
  icon: string
  glowing?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 ${
        glowing ? "bg-amber-500/10 ring-1 ring-amber-500/30" : "bg-stone-800/50"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <div className="text-sm">{children}</div>
    </div>
  )
}
