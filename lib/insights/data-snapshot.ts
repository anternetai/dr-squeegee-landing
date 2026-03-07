/**
 * Data Snapshot Builder — AI Insights Engine
 *
 * Pulls all relevant data from Supabase and builds a structured
 * snapshot for AI analysis. Uses admin client (service role).
 */

import { createClient } from "@supabase/supabase-js"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NeighborhoodAggregate {
  total_knocked: number
  total_opened: number
  total_pitched: number
  total_closed: number
  total_revenue: number
  total_minutes: number
  session_count: number
  sessions_by_day: Record<string, number>
  sessions_by_hour: Record<string, number>
}

export interface DataSnapshot {
  door_knocking: {
    sessions: DoorKnockRow[]
    territory_doors: TerritoryDoorRow[]
    neighborhoods: string[]
    aggregate: Record<string, NeighborhoodAggregate>
  }
  cold_calling: {
    calls: CallHistoryRow[]
    daily_stats: DailyStatsRow[]
    outcome_distribution: Record<string, number>
    calls_by_hour: Record<string, number>
    calls_by_day: Record<string, number>
  }
  past_insights: AiInsightRow[]
  metadata: {
    snapshot_date: string
    total_door_sessions: number
    total_cold_calls: number
    days_of_data: number
  }
}

interface DoorKnockRow {
  id: string
  session_date: string
  neighborhood: string
  street: string | null
  doors_knocked: number
  doors_opened: number
  pitches_given: number
  jobs_closed: number
  revenue_closed: number
  session_minutes: number | null
  weather: string | null
  notes: string | null
  knocked_at: string
}

interface TerritoryDoorRow {
  id: string
  neighborhood: string
  status: string
  total_visits: number
  visits: unknown[]
  notes: string | null
}

interface CallHistoryRow {
  id: string
  call_date: string
  call_time: string
  outcome: string
  notes: string | null
  attempt_number: number
  lead:
    | {
        business_name: string | null
        state: string | null
        timezone: string | null
      }[]
    | null
}

interface DailyStatsRow {
  id: string
  call_date: string
  total_dials: number
  contacts: number
  conversations: number
  demos_booked: number
  demos_held: number
  deals_closed: number
  hours_dialed: number | null
  notes: string | null
}

export interface AiInsightRow {
  id: string
  category: string
  trigger: string
  analysis: Record<string, unknown>
  raw_response: string | null
  created_at: string
}

// ─── Snapshot Builder ────────────────────────────────────────────────────────

export async function buildDataSnapshot(
  category?: string
): Promise<DataSnapshot> {
  const admin = getAdmin()

  // Parallel fetch all data
  const [
    doorKnocksRes,
    territoryDoorsRes,
    callHistoryRes,
    dailyStatsRes,
    pastInsightsRes,
  ] = await Promise.all([
    admin
      .from("door_knocks")
      .select(
        "id, session_date, neighborhood, street, doors_knocked, doors_opened, pitches_given, jobs_closed, revenue_closed, session_minutes, weather, notes, knocked_at"
      )
      .order("session_date", { ascending: false }),
    admin
      .from("territory_doors")
      .select("id, neighborhood, status, total_visits, visits, notes")
      .order("neighborhood"),
    admin
      .from("dialer_call_history")
      .select(
        "id, call_date, call_time, outcome, notes, attempt_number, lead:dialer_leads(business_name, state, timezone)"
      )
      .order("call_date", { ascending: false })
      .limit(500),
    admin
      .from("daily_call_stats")
      .select("*")
      .order("call_date", { ascending: false })
      .limit(90),
    admin
      .from("ai_insights")
      .select("id, category, trigger, analysis, raw_response, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const doorKnocks = (doorKnocksRes.data ?? []) as DoorKnockRow[]
  const territoryDoors = (territoryDoorsRes.data ?? []) as TerritoryDoorRow[]
  const callHistory = (callHistoryRes.data ?? []) as CallHistoryRow[]
  const dailyStats = (dailyStatsRes.data ?? []) as DailyStatsRow[]
  const pastInsights = (pastInsightsRes.data ?? []) as AiInsightRow[]

  // Build neighborhood aggregates
  const aggregate: Record<string, NeighborhoodAggregate> = {}
  for (const s of doorKnocks) {
    if (!aggregate[s.neighborhood]) {
      aggregate[s.neighborhood] = {
        total_knocked: 0,
        total_opened: 0,
        total_pitched: 0,
        total_closed: 0,
        total_revenue: 0,
        total_minutes: 0,
        session_count: 0,
        sessions_by_day: {},
        sessions_by_hour: {},
      }
    }
    const a = aggregate[s.neighborhood]
    a.total_knocked += s.doors_knocked
    a.total_opened += s.doors_opened
    a.total_pitched += s.pitches_given
    a.total_closed += s.jobs_closed
    a.total_revenue += s.revenue_closed
    a.total_minutes += s.session_minutes ?? 0
    a.session_count += 1

    // Day of week
    const dayName = new Date(s.session_date + "T12:00:00").toLocaleDateString(
      "en-US",
      { weekday: "long" }
    )
    a.sessions_by_day[dayName] = (a.sessions_by_day[dayName] || 0) + 1

    // Hour of day from knocked_at
    if (s.knocked_at) {
      const hour = new Date(s.knocked_at).getHours().toString()
      a.sessions_by_hour[hour] = (a.sessions_by_hour[hour] || 0) + 1
    }
  }

  // Build cold call aggregates
  const outcome_distribution: Record<string, number> = {}
  const calls_by_hour: Record<string, number> = {}
  const calls_by_day: Record<string, number> = {}

  for (const c of callHistory) {
    outcome_distribution[c.outcome] =
      (outcome_distribution[c.outcome] || 0) + 1

    // Hour from call_time (format "HH:MM:SS" or "HH:MM")
    if (c.call_time) {
      const hour = c.call_time.split(":")[0]
      calls_by_hour[hour] = (calls_by_hour[hour] || 0) + 1
    }

    // Day of week from call_date
    if (c.call_date) {
      const dayName = new Date(c.call_date + "T12:00:00").toLocaleDateString(
        "en-US",
        { weekday: "long" }
      )
      calls_by_day[dayName] = (calls_by_day[dayName] || 0) + 1
    }
  }

  // Calculate days of data
  const allDates = [
    ...doorKnocks.map((d) => d.session_date),
    ...callHistory.map((c) => c.call_date),
  ].filter(Boolean)
  const uniqueDates = new Set(allDates)
  const daysOfData = uniqueDates.size

  const neighborhoods = [
    ...new Set(doorKnocks.map((d) => d.neighborhood)),
  ].sort()

  return {
    door_knocking: {
      sessions: doorKnocks,
      territory_doors: territoryDoors,
      neighborhoods,
      aggregate,
    },
    cold_calling: {
      calls: callHistory,
      daily_stats: dailyStats,
      outcome_distribution,
      calls_by_hour,
      calls_by_day,
    },
    past_insights: pastInsights,
    metadata: {
      snapshot_date: new Date().toISOString(),
      total_door_sessions: doorKnocks.length,
      total_cold_calls: callHistory.length,
      days_of_data: daysOfData,
    },
  }
}
