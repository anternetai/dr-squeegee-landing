import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET — get active session or recent sessions
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const { searchParams } = new URL(req.url)
  const activeOnly = searchParams.get("active") === "true"

  if (activeOnly) {
    const { data } = await admin
      .from("call_sessions")
      .select("*")
      .eq("status", "active")
      .order("started_at", { ascending: false })
      .limit(1)
      .single()
    return NextResponse.json(data)
  }

  const { data } = await admin
    .from("call_sessions")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(10)
  return NextResponse.json(data || [])
}

// POST — start a new session
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const body = await req.json()

  // End any active sessions first
  await admin
    .from("call_sessions")
    .update({ status: "completed", ended_at: new Date().toISOString() })
    .eq("status", "active")

  // Get today's dial count for baseline
  const today = new Date().toISOString().split("T")[0]
  const { count: dialsToday } = await admin
    .from("dialer_call_history")
    .select("*", { count: "exact", head: true })
    .eq("call_date", today)

  const { data, error } = await admin
    .from("call_sessions")
    .insert({
      dials_at_start: dialsToday || 0,
      mood_before: body.mood_before || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — end session
export async function PATCH(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const body = await req.json()

  // Get active session
  const { data: session } = await admin
    .from("call_sessions")
    .select("*")
    .eq("status", "active")
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  if (!session) return NextResponse.json({ error: "No active session" }, { status: 404 })

  // Get current dial count
  const today = new Date().toISOString().split("T")[0]
  const { count: dialsNow } = await admin
    .from("dialer_call_history")
    .select("*", { count: "exact", head: true })
    .eq("call_date", today)

  const endedAt = new Date()
  const startedAt = new Date(session.started_at)
  const durationMinutes = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)

  const { data, error } = await admin
    .from("call_sessions")
    .update({
      status: "completed",
      ended_at: endedAt.toISOString(),
      dials_at_end: dialsNow || 0,
      duration_minutes: durationMinutes,
      mood_after: body.mood_after || null,
      notes: body.notes || null,
    })
    .eq("id", session.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
