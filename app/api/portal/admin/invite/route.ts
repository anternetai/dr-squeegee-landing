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

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    return NextResponse.json(
      { error: "Resend API key not configured" },
      { status: 500 }
    )
  }

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  // Generate invite link without sending email (bypasses Supabase SMTP)
  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || "https://homefieldhub.com"}/portal/accept-invite`

  const { data: linkData, error: linkError } = await adminSupabase.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
      data: {
        agency_client_id: client.id,
        first_name: client.first_name,
      },
    },
  })

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 500 })
  }

  // Build the confirmation URL from the token properties
  const {
    properties: { hashed_token, verification_type },
  } = linkData

  const confirmUrl = new URL("/auth/v1/verify", process.env.NEXT_PUBLIC_SUPABASE_URL!)
  confirmUrl.searchParams.set("token", hashed_token)
  confirmUrl.searchParams.set("type", verification_type)
  confirmUrl.searchParams.set("redirect_to", redirectTo)

  // Send invite email via Resend HTTP API
  const resendRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "HomeField Hub <anthony@homefieldhub.com>",
      to: [email],
      subject: "You're invited to HomeField Hub",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a1a; margin-bottom: 8px;">Welcome to HomeField Hub${client.first_name ? `, ${client.first_name}` : ""}!</h2>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">
            Your client portal is ready. Click the button below to set your password and access your dashboard — you'll be able to see your leads, appointments, and billing all in one place.
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

  if (!resendRes.ok) {
    const resendError = await resendRes.text()
    console.error("Resend email failed:", resendError)
    return NextResponse.json({ error: "Failed to send invite email" }, { status: 500 })
  }

  // Link auth user to agency_clients record (use admin client to bypass RLS)
  if (linkData.user) {
    await adminSupabase
      .from("agency_clients")
      .update({ auth_user_id: linkData.user.id })
      .eq("id", client.id)
  }

  return NextResponse.json({ success: true, email })
}
