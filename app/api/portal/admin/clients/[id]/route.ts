import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin role
  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Prevent deleting own account
  const { data: targetClient } = await supabase
    .from("agency_clients")
    .select("auth_user_id")
    .eq("id", id)
    .single()

  if (!targetClient) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  if (targetClient.auth_user_id === user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
  }

  // Soft delete: set deleted_at timestamp
  const { error } = await supabase
    .from("agency_clients")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)

  if (error) {
    // If deleted_at column doesn't exist yet, fall back to hard delete
    if (error.message.includes("deleted_at")) {
      const { error: deleteError } = await supabase
        .from("agency_clients")
        .delete()
        .eq("id", id)

      if (deleteError) {
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }
    } else {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
