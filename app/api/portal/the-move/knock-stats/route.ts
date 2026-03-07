import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { KnockStats } from "@/lib/the-move/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const neighborhood = searchParams.get("neighborhood")

  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]

  // Monday of this week
  const now = new Date()
  const dayOfWeek = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  const mondayStr = monday.toISOString().split("T")[0]

  // Build base filter
  function withFilter(query: any) {
    if (neighborhood) return query.eq("neighborhood", neighborhood)
    return query
  }

  // Run all queries in parallel
  const [allTimeRes, todayRes, weekRes, datesRes, bestNhRes, avgDphRes] = await Promise.all([
    // 1. All-time sums
    withFilter(
      admin.from("door_knocks").select("doors_knocked, doors_opened, pitches_given, jobs_closed, revenue_closed")
    ),
    // 2. Today sums
    withFilter(
      admin.from("door_knocks").select("doors_knocked, doors_opened, pitches_given, jobs_closed, revenue_closed")
        .eq("session_date", today)
    ),
    // 3. This week sums
    withFilter(
      admin.from("door_knocks").select("doors_knocked, doors_opened, pitches_given, jobs_closed, revenue_closed")
        .gte("session_date", mondayStr)
    ),
    // 4. Distinct session dates for streak
    withFilter(
      admin.from("door_knocks").select("session_date")
        .order("session_date", { ascending: false })
    ),
    // 5. Best neighborhood (only when not filtered)
    neighborhood
      ? Promise.resolve({ data: null })
      : admin.rpc("exec_sql", { query: "SELECT 1" }).then(() =>
          admin.from("door_knocks")
            .select("neighborhood, doors_knocked, jobs_closed")
        ),
    // 6. Avg doors/hour
    withFilter(
      admin.from("door_knocks").select("doors_knocked, session_minutes")
        .gt("session_minutes", 0)
    ),
  ])

  // Sum helper
  function sumField(rows: any[] | null, field: string): number {
    if (!rows) return 0
    return rows.reduce((sum, r) => sum + (r[field] || 0), 0)
  }

  const allTime = allTimeRes.data || []
  const todayData = todayRes.data || []
  const weekData = weekRes.data || []

  // Compute streak from distinct dates
  const uniqueDates = [...new Set((datesRes.data || []).map((r: any) => r.session_date))].sort().reverse() as string[]
  let currentStreak = 0
  let bestStreak = 0
  if (uniqueDates.length > 0) {
    // Walk backward from today
    const d = new Date(today + "T12:00:00")
    // If no session today, check if yesterday had one (streak broken)
    let checkDate = today
    if (uniqueDates[0] !== today) {
      // No session today — streak is 0 (but still calculate best)
      currentStreak = 0
    } else {
      currentStreak = 1
      const cursor = new Date(d)
      cursor.setDate(cursor.getDate() - 1)
      for (let i = 1; i < uniqueDates.length; i++) {
        const expected = cursor.toISOString().split("T")[0]
        if (uniqueDates[i] === expected) {
          currentStreak++
          cursor.setDate(cursor.getDate() - 1)
        } else {
          break
        }
      }
    }

    // Best streak
    let streak = 1
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = new Date(uniqueDates[i - 1] + "T12:00:00")
      const curr = new Date(uniqueDates[i] + "T12:00:00")
      const diffDays = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
      if (Math.abs(diffDays - 1) < 0.01) {
        streak++
      } else {
        bestStreak = Math.max(bestStreak, streak)
        streak = 1
      }
    }
    bestStreak = Math.max(bestStreak, streak, currentStreak)
  }

  // Best neighborhood
  let bestNeighborhood: string | null = null
  let bestNeighborhoodCloseRate: number | null = null
  if (!neighborhood && bestNhRes.data) {
    const byNh: Record<string, { knocked: number; closed: number }> = {}
    for (const r of bestNhRes.data) {
      if (!byNh[r.neighborhood]) byNh[r.neighborhood] = { knocked: 0, closed: 0 }
      byNh[r.neighborhood].knocked += r.doors_knocked || 0
      byNh[r.neighborhood].closed += r.jobs_closed || 0
    }
    let bestRate = 0
    for (const [name, stats] of Object.entries(byNh)) {
      if (stats.knocked >= 5) {
        const rate = stats.closed / stats.knocked
        if (rate > bestRate) {
          bestRate = rate
          bestNeighborhood = name
          bestNeighborhoodCloseRate = Math.round(rate * 100)
        }
      }
    }
  }

  // Avg doors per hour
  let avgDoorsPerHour: number | null = null
  const dphData = avgDphRes.data || []
  if (dphData.length > 0) {
    const totalDoors = sumField(dphData, "doors_knocked")
    const totalMinutes = sumField(dphData, "session_minutes")
    if (totalMinutes > 0) {
      avgDoorsPerHour = Math.round((totalDoors / totalMinutes) * 60)
    }
  }

  const stats: KnockStats = {
    allTimeKnocked: sumField(allTime, "doors_knocked"),
    allTimeOpened: sumField(allTime, "doors_opened"),
    allTimePitched: sumField(allTime, "pitches_given"),
    allTimeClosed: sumField(allTime, "jobs_closed"),
    allTimeRevenue: sumField(allTime, "revenue_closed"),
    allTimeSessions: allTime.length,
    todayKnocked: sumField(todayData, "doors_knocked"),
    todayOpened: sumField(todayData, "doors_opened"),
    todayPitched: sumField(todayData, "pitches_given"),
    todayClosed: sumField(todayData, "jobs_closed"),
    todayRevenue: sumField(todayData, "revenue_closed"),
    todaySessions: todayData.length,
    weekKnocked: sumField(weekData, "doors_knocked"),
    weekOpened: sumField(weekData, "doors_opened"),
    weekPitched: sumField(weekData, "pitches_given"),
    weekClosed: sumField(weekData, "jobs_closed"),
    currentStreak,
    bestStreak,
    bestNeighborhood,
    bestNeighborhoodCloseRate,
    avgDoorsPerHour,
  }

  return NextResponse.json(stats)
}
