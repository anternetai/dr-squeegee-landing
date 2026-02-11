import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    // Only allow notification preference fields
    const updates: Record<string, boolean> = {}
    if (typeof body.notify_email === "boolean") updates.notify_email = body.notify_email
    if (typeof body.notify_sms === "boolean") updates.notify_sms = body.notify_sms

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields" }, { status: 400 })
    }

    // Use service role to bypass RLS for self-update
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json({ error: "Service role key not configured" }, { status: 500 })
    }

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    )

    const { data, error } = await adminSupabase
      .from("agency_clients")
      .update(updates)
      .eq("auth_user_id", user.id)
      .select("notify_email, notify_sms")
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error("PATCH /api/portal/settings error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
