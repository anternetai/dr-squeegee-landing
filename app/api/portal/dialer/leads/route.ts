import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { DialerLead, DialerStatus, DialerTimezone, DialerOutcome } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const VALID_SORT_FIELDS = ["created_at", "attempt_count", "last_called_at", "business_name", "owner_name", "phone_number", "state", "status", "last_outcome", "next_call_at"] as const
type SortField = (typeof VALID_SORT_FIELDS)[number]

// GET /api/portal/dialer/leads - paginated, filterable list of dialer leads
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const url = new URL(req.url)

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"))
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") || "50")))
  const offset = (page - 1) * limit

  // Filters
  const status = url.searchParams.get("status") as DialerStatus | null
  const state = url.searchParams.get("state")
  const timezone = url.searchParams.get("timezone") as DialerTimezone | null
  const outcome = url.searchParams.get("outcome") as DialerOutcome | null
  const demoBooked = url.searchParams.get("demo_booked")
  // Sanitize search: strip characters that could break PostgREST .or() filter syntax
  const rawSearch = url.searchParams.get("search")
  const search = rawSearch ? rawSearch.replace(/[%_\\(),.]/g, "") : null

  // Sorting
  const rawSort = url.searchParams.get("sort") || "created_at"
  const sort: SortField = VALID_SORT_FIELDS.includes(rawSort as SortField)
    ? (rawSort as SortField)
    : "created_at"
  const ascending = url.searchParams.get("order") === "asc"

  // --- Data query ---
  let dataQuery = admin
    .from("dialer_leads")
    .select("*")
    .order(sort, { ascending })
    .range(offset, offset + limit - 1)

  if (status) dataQuery = dataQuery.eq("status", status)
  if (state) dataQuery = dataQuery.ilike("state", state)
  if (timezone) dataQuery = dataQuery.eq("timezone", timezone)
  if (outcome) dataQuery = dataQuery.eq("last_outcome", outcome)
  if (demoBooked === "true") dataQuery = dataQuery.eq("demo_booked", true)
  if (search) {
    dataQuery = dataQuery.or(
      `business_name.ilike.%${search}%,owner_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    )
  }

  // --- Count query ---
  let countQuery = admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })

  if (status) countQuery = countQuery.eq("status", status)
  if (state) countQuery = countQuery.ilike("state", state)
  if (timezone) countQuery = countQuery.eq("timezone", timezone)
  if (outcome) countQuery = countQuery.eq("last_outcome", outcome)
  if (demoBooked === "true") countQuery = countQuery.eq("demo_booked", true)
  if (search) {
    countQuery = countQuery.or(
      `business_name.ilike.%${search}%,owner_name.ilike.%${search}%,phone_number.ilike.%${search}%`
    )
  }

  const [{ data: leads, error: leadsError }, { count, error: countError }] = await Promise.all([
    dataQuery,
    countQuery,
  ])

  if (leadsError) {
    return NextResponse.json({ error: leadsError.message }, { status: 500 })
  }
  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 500 })
  }

  const total = count || 0
  const totalPages = Math.ceil(total / limit)

  return NextResponse.json({
    leads: (leads || []) as DialerLead[],
    total,
    page,
    totalPages,
  })
}
