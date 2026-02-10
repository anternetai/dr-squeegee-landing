import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
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

  // Fetch all clients with aggregated metrics (exclude soft-deleted)
  const { data: clients } = await supabase
    .from("agency_clients")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (!clients) {
    return NextResponse.json({ clients: [] })
  }

  const clientMetrics = await Promise.all(
    clients.map(async (client) => {
      const [leadsRes, appointmentsRes, showedRes, paymentsRes, lastLeadRes] =
        await Promise.all([
          supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .eq("client_id", client.id)
            .eq("status", "showed"),
          supabase
            .from("payments")
            .select("amount_cents")
            .eq("client_id", client.id)
            .eq("status", "succeeded"),
          supabase
            .from("leads")
            .select("created_at")
            .eq("client_id", client.id)
            .order("created_at", { ascending: false })
            .limit(1),
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
      const lastLeadAt = lastLeadRes.data?.[0]?.created_at ?? null

      return {
        ...client,
        lead_count: leadCount,
        appointment_count: appointmentCount,
        show_rate: showRate,
        total_charged: totalCharged,
        last_lead_at: lastLeadAt,
      }
    })
  )

  return NextResponse.json({ clients: clientMetrics })
}
