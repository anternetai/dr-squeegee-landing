import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { verifyCrmAuth } from "@/lib/crm-auth-check"
import type { DoorVisit, TerritoryDoor } from "@/lib/the-move/types"

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Derive a door status string from the most recent visit. */
function deriveStatus(visits: DoorVisit[]): string {
  if (visits.length === 0) return "not_home"
  const latest = visits[visits.length - 1]
  if (latest.closed) return "closed"
  if (latest.not_interested) return "not_interested"
  if (latest.pitched) return "pitched"
  if (latest.answered) return "talked"
  return "not_home"
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> },
) {
  const authed = await verifyCrmAuth()
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const body = await req.json()
  const { visit } = body as { visit: DoorVisit }

  if (!visit) {
    return NextResponse.json({ error: "visit is required" }, { status: 400 })
  }

  const supabase = getSupabase()

  // Fetch current door
  const { data: door, error: fetchError } = await supabase
    .from("territory_doors")
    .select("*")
    .eq("id", id)
    .single()

  if (fetchError || !door) {
    return NextResponse.json({ error: "Door not found" }, { status: 404 })
  }

  const currentDoor = door as TerritoryDoor
  const updatedVisits: DoorVisit[] = [...((currentDoor.visits as DoorVisit[]) ?? []), visit]
  const newStatus = deriveStatus(updatedVisits)

  const { data: updated, error: updateError } = await supabase
    .from("territory_doors")
    .update({
      visits: updatedVisits,
      status: newStatus,
      total_visits: updatedVisits.length,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ door: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string; id: string }> },
) {
  const authed = await verifyCrmAuth()
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  const supabase = getSupabase()

  const { error } = await supabase.from("territory_doors").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
