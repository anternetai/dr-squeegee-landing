import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
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

  if (body.doors_opened !== undefined && body.doors_knocked !== undefined) {
    if (body.doors_opened > body.doors_knocked) {
      return NextResponse.json({ error: "Opened cannot exceed knocked" }, { status: 400 })
    }
  }
  if (body.pitches_given !== undefined && body.doors_opened !== undefined) {
    if (body.pitches_given > body.doors_opened) {
      return NextResponse.json({ error: "Pitches cannot exceed opened" }, { status: 400 })
    }
  }
  if (body.jobs_closed !== undefined && body.pitches_given !== undefined) {
    if (body.jobs_closed > body.pitches_given) {
      return NextResponse.json({ error: "Closed cannot exceed pitches" }, { status: 400 })
    }
  }

  const admin = getAdmin()
  const { data, error } = await admin
    .from("door_knocks")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
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
  const { error } = await admin.from("door_knocks").delete().eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
