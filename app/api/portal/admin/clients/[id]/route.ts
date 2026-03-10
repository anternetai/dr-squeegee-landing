import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    // Fetch client record
    const { data: client, error: clientError } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("id", id)
      .is("deleted_at", null)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    // Fetch metrics, tasks, and recent activity in parallel
    const [leadsRes, appointmentsRes, showedRes, paymentsRes, tasksRes, activityRes] =
      await Promise.all([
        supabase
          .from("leads")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id),
        supabase
          .from("appointments")
          .select("id", { count: "exact", head: true })
          .eq("client_id", id)
          .eq("status", "showed"),
        supabase
          .from("payments")
          .select("amount_cents")
          .eq("client_id", id)
          .eq("status", "succeeded"),
        supabase
          .from("client_tasks")
          .select("*")
          .eq("client_id", id)
          .order("sort_order", { ascending: true }),
        supabase
          .from("client_activity")
          .select("*")
          .eq("client_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ])

    const leadCount = leadsRes.count ?? 0
    const appointmentCount = appointmentsRes.count ?? 0
    const showedCount = showedRes.count ?? 0
    const showRate =
      appointmentCount > 0 ? (showedCount / appointmentCount) * 100 : 0
    const totalCharged = (paymentsRes.data ?? []).reduce(
      (sum, p) => sum + ((p.amount_cents ?? 0) / 100),
      0
    )

    const metrics = {
      lead_count: leadCount,
      appointment_count: appointmentCount,
      showed_count: showedCount,
      show_rate: Math.round(showRate * 10) / 10,
      total_charged: totalCharged,
    }

    return NextResponse.json({
      client,
      metrics,
      tasks: tasksRes.data ?? [],
      recentActivity: activityRes.data ?? [],
    })
  } catch (err) {
    console.error("GET /api/portal/admin/clients/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

// Allowed fields that can be updated via PATCH
const PATCHABLE_FIELDS = new Set([
  "legal_business_name",
  "first_name",
  "last_name",
  "business_phone",
  "cell_phone_for_notifications",
  "email_for_notifications",
  "business_email_for_leads",
  "state",
  "city",
  "street_address",
  "postal_code",
  "website_url",
  "service_type",
  "pipeline_stage",
  "pipeline_stage_changed_at",
  "onboarding_status",
  "next_call_at",
  "next_call_type",
  "demo_call_at",
  "onboarding_call_at",
  "launch_call_at",
  "slack_channel_id",
  "differentiator",
  "offer",
  "questions",
  "working_hours",
  "advertising_area",
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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

    const body = await request.json()

    // Only allow specific fields
    const updates: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body)) {
      if (PATCHABLE_FIELDS.has(key)) {
        updates[key] = value
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
    }

    const { data: updatedClient, error } = await supabase
      .from("agency_clients")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select()
      .single()

    if (error || !updatedClient) {
      return NextResponse.json(
        { error: error?.message ?? "Client not found" },
        { status: error ? 500 : 404 }
      )
    }

    // If pipeline_stage changed, log activity
    if (updates.pipeline_stage) {
      await supabase.from("client_activity").insert({
        client_id: id,
        type: "stage_change",
        title: `Pipeline stage changed to ${updates.pipeline_stage}`,
        detail: null,
        metadata: { new_stage: updates.pipeline_stage },
      })
    }

    // If a call was scheduled, log activity
    if (updates.next_call_at) {
      await supabase.from("client_activity").insert({
        client_id: id,
        type: "call",
        title: `${updates.next_call_type ?? "Call"} scheduled`,
        detail: `Scheduled for ${new Date(updates.next_call_at as string).toLocaleString()}`,
        metadata: {
          call_type: updates.next_call_type,
          scheduled_at: updates.next_call_at,
        },
      })
    }

    return NextResponse.json({ client: updatedClient })
  } catch (err) {
    console.error("PATCH /api/portal/admin/clients/[id] error:", err)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

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
