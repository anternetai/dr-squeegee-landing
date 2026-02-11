import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify this is a primary client
    const { data: client } = await supabase
      .from("agency_clients")
      .select("id")
      .eq("auth_user_id", user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: "Not a primary client" }, { status: 403 })
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

    // Verify the team member belongs to this client
    const { data: member } = await adminSupabase
      .from("client_team_members")
      .select("id, client_id")
      .eq("id", id)
      .single()

    if (!member || member.client_id !== client.id) {
      return NextResponse.json({ error: "Team member not found" }, { status: 404 })
    }

    const { error } = await adminSupabase
      .from("client_team_members")
      .delete()
      .eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/portal/team/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
