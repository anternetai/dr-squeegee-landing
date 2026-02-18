import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/leads - list leads with filters
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const url = new URL(req.url)
  const status = url.searchParams.get("status")
  const timezone = url.searchParams.get("timezone")
  const search = url.searchParams.get("search")
  const limit = parseInt(url.searchParams.get("limit") || "50")
  const offset = parseInt(url.searchParams.get("offset") || "0")

  const admin = getAdmin()

  let query = admin
    .from("dialer_leads")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq("status", status)
  if (timezone) query = query.eq("timezone", timezone)
  if (search) {
    query = query.or(
      `business_name.ilike.%${search}%,owner_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    )
  }

  const { data: leads, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ leads, count })
}
