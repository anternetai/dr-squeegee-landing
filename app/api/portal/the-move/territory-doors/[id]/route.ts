import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { DoorVisit } from "@/lib/the-move/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function deriveStatus(visit: DoorVisit): string {
  if (!visit.answered) return "not_home"
  if (visit.not_interested) return "not_interested"
  if (visit.closed) return "closed"
  if (visit.pitched) return "pitched"
  return "talked"
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const admin = getAdmin()

  // If adding a visit
  if (body.visit) {
    const visit = body.visit as DoorVisit

    // Fetch current row
    const { data: door, error: fetchErr } = await admin
      .from("territory_doors")
      .select("visits, total_visits")
      .eq("id", id)
      .single()

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })

    const existing = Array.isArray(door.visits) ? (door.visits as DoorVisit[]) : []
    const visits = [...existing, visit]
    const status = deriveStatus(visit)

    const { data, error } = await admin
      .from("territory_doors")
      .update({
        visits,
        status,
        total_visits: door.total_visits + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  // If updating notes
  if (body.notes !== undefined) {
    const { data, error } = await admin
      .from("territory_doors")
      .update({ notes: body.notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: "No valid update field" }, { status: 400 })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()
  const { error } = await admin.from("territory_doors").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
