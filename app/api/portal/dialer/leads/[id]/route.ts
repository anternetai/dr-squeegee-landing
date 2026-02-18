import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/leads/[id] - get a single lead with call history
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { data: lead, error } = await admin
    .from("dialer_leads")
    .select("*")
    .eq("id", id)
    .single()

  if (error || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const { data: history } = await admin
    .from("dialer_call_history")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })

  return NextResponse.json({ lead, history: history || [] })
}

// PATCH /api/portal/dialer/leads/[id] - update a lead
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const admin = getAdmin()

  const { data, error } = await admin
    .from("dialer_leads")
    .update(body)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ lead: data })
}

// DELETE /api/portal/dialer/leads/[id] - delete a lead
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const admin = getAdmin()

  const { error } = await admin.from("dialer_leads").delete().eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
