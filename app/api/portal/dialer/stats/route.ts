import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import type { DialerTimezone, DailyDialerStats } from "@/lib/dialer/types"
import { TIMEZONE_SCHEDULE } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/stats - get daily dialer stats
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]

  // Total callable leads
  const { count: totalLeads } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .in("status", ["queued", "callback", "in_progress"])
    .lt("attempt_count", 5)

  // Calls made today
  const { count: completedToday } = await admin
    .from("dialer_call_history")
    .select("*", { count: "exact", head: true })
    .eq("call_date", today)

  // Callbacks due today
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const { count: callbacksDueToday } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "callback")
    .lte("next_call_at", endOfDay.toISOString())

  // Breakdown by timezone
  const breakdownByTimezone: Record<DialerTimezone, number> = { ET: 0, CT: 0, MT: 0, PT: 0 }
  for (const tz of ["ET", "CT", "MT", "PT"] as DialerTimezone[]) {
    const { count } = await admin
      .from("dialer_leads")
      .select("*", { count: "exact", head: true })
      .in("status", ["queued", "callback"])
      .eq("timezone", tz)
      .lt("attempt_count", 5)
    breakdownByTimezone[tz] = count || 0
  }

  // Breakdown by hour block for today
  const breakdownByHour = TIMEZONE_SCHEDULE.map((s) => ({
    hour: s.label,
    timezone: s.timezone,
    count: breakdownByTimezone[s.timezone],
  }))

  // Today's outcomes
  const { data: todayHistory } = await admin
    .from("dialer_call_history")
    .select("outcome")
    .eq("call_date", today)

  const todayOutcomes: Record<string, number> = {}
  for (const h of todayHistory || []) {
    todayOutcomes[h.outcome] = (todayOutcomes[h.outcome] || 0) + 1
  }

  // Demo stats
  const { count: totalDemos } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .eq("demo_booked", true)

  const { count: totalCompleted } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "completed")

  const { count: totalArchived } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .eq("status", "archived")

  const stats: DailyDialerStats & {
    totalDemos: number
    totalCompleted: number
    totalArchived: number
  } = {
    totalLeads: totalLeads || 0,
    completedToday: completedToday || 0,
    callbacksDueToday: callbacksDueToday || 0,
    breakdownByTimezone,
    breakdownByHour,
    todayOutcomes,
    totalDemos: totalDemos || 0,
    totalCompleted: totalCompleted || 0,
    totalArchived: totalArchived || 0,
  }

  return NextResponse.json(stats)
}
