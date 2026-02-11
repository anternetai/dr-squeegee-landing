import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Find the client this user belongs to
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

    const { data: members, error } = await adminSupabase
      .from("client_team_members")
      .select("*")
      .eq("client_id", client.id)
      .order("created_at", { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ members: members ?? [] })
  } catch (err) {
    console.error("GET /api/portal/team error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify this is a primary client
    const { data: client } = await supabase
      .from("agency_clients")
      .select("id, first_name, legal_business_name")
      .eq("auth_user_id", user.id)
      .single()

    if (!client) {
      return NextResponse.json({ error: "Not a primary client" }, { status: 403 })
    }

    const { email, first_name, last_name, role } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const memberRole = role === "manager" ? "manager" : "viewer"

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const resendApiKey = process.env.RESEND_API_KEY

    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey)

    // Check if already a team member
    const { data: existing } = await adminSupabase
      .from("client_team_members")
      .select("id")
      .eq("client_id", client.id)
      .eq("email", email)
      .single()

    if (existing) {
      return NextResponse.json({ error: "This person is already a team member" }, { status: 400 })
    }

    // Generate invite link
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"
    const redirectTo = `${siteUrl}/auth/callback?next=/portal/accept-invite`

    const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
      type: "invite",
      email,
      options: {
        redirectTo,
        data: {
          team_member: true,
          client_id: client.id,
          first_name: first_name || undefined,
        },
      },
    })

    if (linkError) {
      return NextResponse.json({ error: linkError.message }, { status: 500 })
    }

    // Insert team member record
    const { error: insertError } = await adminSupabase
      .from("client_team_members")
      .insert({
        client_id: client.id,
        auth_user_id: linkData.user.id,
        email,
        first_name: first_name || null,
        last_name: last_name || null,
        role: memberRole,
        invited_by: client.id,
      })

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Send invite email via Resend if key is available
    if (resendApiKey) {
      const { properties: { hashed_token } } = linkData
      const confirmUrl = new URL("/portal/accept-invite", siteUrl)
      confirmUrl.searchParams.set("token_hash", hashed_token)
      confirmUrl.searchParams.set("type", "invite")

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "HomeField Hub <anthony@homefieldhub.com>",
          to: [email],
          subject: `You've been invited to ${client.legal_business_name}'s portal`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <h2 style="color: #1a1a1a; margin-bottom: 8px;">You're invited${first_name ? `, ${first_name}` : ""}!</h2>
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                ${client.first_name} has invited you to join <strong>${client.legal_business_name}</strong>'s portal on HomeField Hub as a <strong>${memberRole}</strong>.
              </p>
              <p style="color: #555; font-size: 16px; line-height: 1.5;">
                Click below to set your password and access the dashboard.
              </p>
              <a href="${confirmUrl.toString()}" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; margin: 24px 0;">
                Accept Invite &amp; Set Password
              </a>
              <p style="color: #888; font-size: 13px; margin-top: 32px;">
                If you didn't expect this email, you can safely ignore it.<br/>
                This link expires in 24 hours.
              </p>
            </div>
          `,
        }),
      })
    }

    return NextResponse.json({ success: true, email })
  } catch (err) {
    console.error("POST /api/portal/team error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
