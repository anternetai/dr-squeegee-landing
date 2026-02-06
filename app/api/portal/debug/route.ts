import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Not authenticated", authError })
  }

  // Try to get client record
  const { data: client, error: clientError } = await supabase
    .from("agency_clients")
    .select("id, legal_business_name, owner_name, email, auth_user_id, role")
    .eq("auth_user_id", user.id)
    .single()

  // Also check if any agency_clients have this auth_user_id at all (bypass RLS issue check)
  const { count } = await supabase
    .from("agency_clients")
    .select("id", { count: "exact", head: true })

  return NextResponse.json({
    auth_user_id: user.id,
    auth_email: user.email,
    client,
    clientError,
    total_clients_visible: count,
  })
}
