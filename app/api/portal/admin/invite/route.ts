import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const serverSupabase = await createServerClient()

  const {
    data: { user },
  } = await serverSupabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin role
  const { data: adminClient } = await serverSupabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { clientId } = await request.json()

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 })
  }

  // Get the client record
  const { data: client } = await serverSupabase
    .from("agency_clients")
    .select("id, email_for_notifications, business_email_for_leads, first_name, auth_user_id")
    .eq("id", clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 })
  }

  if (client.auth_user_id) {
    return NextResponse.json({ error: "Client already has an account" }, { status: 400 })
  }

  const email = client.email_for_notifications || client.business_email_for_leads
  if (!email) {
    return NextResponse.json({ error: "Client has no email address" }, { status: 400 })
  }

  // Use service role client for admin operations
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Service role key not configured" },
      { status: 500 }
    )
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  // Invite user by email
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"}/portal/dashboard`,
    data: {
      agency_client_id: client.id,
      first_name: client.first_name,
    },
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Link auth user to agency_clients record
  if (inviteData.user) {
    await serverSupabase
      .from("agency_clients")
      .update({ auth_user_id: inviteData.user.id })
      .eq("id", client.id)
  }

  return NextResponse.json({ success: true, email })
}
