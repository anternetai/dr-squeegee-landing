import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getDaysUntilMove, getCurrentPhase } from "@/lib/the-move/constants"
import type { MoveStats } from "@/lib/the-move/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const monday = new Date(now)
  monday.setDate(diff)
  monday.setHours(0, 0, 0, 0)
  return monday.toISOString().split("T")[0]
}

function getMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
}

export async function GET() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const today = new Date().toISOString().split("T")[0]
  const weekStart = getWeekStart()
  const monthStart = getMonthStart()

  const [
    clientsRes,
    weekDialsRes,
    todayDialsRes,
    knocksRes,
    pwRevenueRes,
    pwJobsRes,
  ] = await Promise.all([
    // 1. Active clients
    admin
      .from("agency_clients")
      .select("legal_business_name")
      .eq("role", "client")
      .eq("onboarding_status", "active"),

    // 2. This week's dials + outcomes
    admin
      .from("dialer_call_history")
      .select("outcome")
      .gte("call_date", weekStart),

    // 3. Today's dials
    admin
      .from("dialer_call_history")
      .select("*", { count: "exact", head: true })
      .eq("call_date", today),

    // 4. This week's door knocks
    admin
      .from("door_knocks")
      .select("doors_knocked, doors_opened, pitches_given, jobs_closed")
      .gte("session_date", weekStart),

    // 5. This month's PW revenue
    admin
      .from("squeegee_invoices")
      .select("amount")
      .eq("status", "paid")
      .gte("created_at", monthStart),

    // 6. This month's completed PW jobs
    admin
      .from("squeegee_jobs")
      .select("*", { count: "exact", head: true })
      .eq("status", "complete")
      .gte("created_at", monthStart),
  ])

  const clients = clientsRes.data || []
  const weekCalls = weekDialsRes.data || []
  const knocks = knocksRes.data || []
  const invoices = pwRevenueRes.data || []

  const stats: MoveStats = {
    activeClients: clients.length,
    clientNames: clients.map((c) => c.legal_business_name).filter(Boolean),
    weekDials: weekCalls.length,
    weekConversations: weekCalls.filter((c) => c.outcome === "conversation" || c.outcome === "demo_booked").length,
    weekDemos: weekCalls.filter((c) => c.outcome === "demo_booked").length,
    todayDials: todayDialsRes.count || 0,
    weekDoorsKnocked: knocks.reduce((sum, k) => sum + (k.doors_knocked || 0), 0),
    weekDoorsOpened: knocks.reduce((sum, k) => sum + (k.doors_opened || 0), 0),
    weekPitchesGiven: knocks.reduce((sum, k) => sum + (k.pitches_given || 0), 0),
    weekJobsClosed: knocks.reduce((sum, k) => sum + (k.jobs_closed || 0), 0),
    monthPWRevenue: invoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0),
    monthPWJobs: pwJobsRes.count || 0,
    daysUntilMove: getDaysUntilMove(),
    currentPhase: getCurrentPhase().name,
  }

  return NextResponse.json(stats)
}
