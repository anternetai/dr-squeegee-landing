import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

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
  const limit = Number(searchParams.get("limit")) || 20
  const dateFrom = searchParams.get("date_from")
  const dateTo = searchParams.get("date_to")
  const neighborhood = searchParams.get("neighborhood")

  const admin = getAdmin()
  let query = admin
    .from("door_knocks")
    .select("*")
    .order("session_date", { ascending: false })
    .order("knocked_at", { ascending: false })
    .limit(limit)

  if (dateFrom) query = query.gte("session_date", dateFrom)
  if (dateTo) query = query.lte("session_date", dateTo)
  if (neighborhood) query = query.eq("neighborhood", neighborhood)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    neighborhood,
    street,
    notes,
    doors_knocked = 0,
    doors_opened = 0,
    pitches_given = 0,
    jobs_closed = 0,
    revenue_closed = 0,
    session_minutes,
    weather,
    session_date,
    gps_pins,
  } = body

  if (!neighborhood) {
    return NextResponse.json({ error: "Neighborhood is required" }, { status: 400 })
  }
  if (doors_opened > doors_knocked) {
    return NextResponse.json({ error: "Opened cannot exceed knocked" }, { status: 400 })
  }
  if (pitches_given > doors_opened) {
    return NextResponse.json({ error: "Pitches cannot exceed opened" }, { status: 400 })
  }
  if (jobs_closed > pitches_given) {
    return NextResponse.json({ error: "Closed cannot exceed pitches" }, { status: 400 })
  }

  const admin = getAdmin()
  const { data, error } = await admin
    .from("door_knocks")
    .insert({
      neighborhood,
      street: street || null,
      notes: notes || null,
      doors_knocked,
      doors_opened,
      pitches_given,
      jobs_closed,
      revenue_closed,
      session_minutes: session_minutes || null,
      weather: weather || null,
      session_date: session_date || new Date().toISOString().split("T")[0],
      gps_pins: gps_pins || [],
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}
