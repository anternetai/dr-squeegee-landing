import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

interface LineItem {
  description: string
  qty: number
  unit_price_cents: number
  subtotal_cents: number
}

interface CreateQuoteBody {
  prospect_id: string
  prospect_name: string
  prospect_phone?: string
  prospect_email?: string
  title: string
  description?: string
  line_items: LineItem[]
  total_cents: number
  expires_at?: string
}

async function verifyAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: "Unauthorized", status: 401 }

  const { data: adminClient } = await supabase
    .from("agency_clients")
    .select("role")
    .eq("auth_user_id", user.id)
    .single()

  if (!adminClient || adminClient.role !== "admin") {
    return { error: "Forbidden", status: 403 }
  }

  return { user }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const auth = await verifyAdmin(supabase)
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const body: CreateQuoteBody = await request.json()

    const {
      prospect_id,
      prospect_name,
      prospect_phone,
      prospect_email,
      title,
      description,
      line_items,
      total_cents,
      expires_at,
    } = body

    if (!prospect_name || !title || !Array.isArray(line_items)) {
      return NextResponse.json(
        { error: "Missing required fields: prospect_name, title, line_items" },
        { status: 400 }
      )
    }

    const { data: quote, error } = await supabase
      .from("quotes")
      .insert({
        prospect_id: prospect_id || null,
        prospect_name,
        prospect_phone: prospect_phone || null,
        prospect_email: prospect_email || null,
        title,
        description: description || null,
        line_items,
        total_cents,
        created_by_user_id: auth.user.id,
        expires_at: expires_at || null,
      })
      .select("*")
      .single()

    if (error) {
      console.error("POST /api/portal/admin/quotes error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quote }, { status: 201 })
  } catch (err) {
    console.error("POST /api/portal/admin/quotes error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
