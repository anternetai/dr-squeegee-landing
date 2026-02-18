import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { STATE_TIMEZONE_MAP } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(phone: string): string {
  // Strip everything except digits
  const digits = phone.replace(/\D/g, "")
  // If it starts with 1 and is 11 digits, remove the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1)
  }
  return digits
}

function getTimezone(state: string): string | null {
  const normalized = state?.trim().toUpperCase()
  // Handle full state names by checking first 2 chars if it's an abbreviation
  if (normalized && normalized.length === 2) {
    return STATE_TIMEZONE_MAP[normalized] || null
  }
  // Try common full names
  const stateAbbrevMap: Record<string, string> = {
    "ALABAMA": "AL", "ALASKA": "AK", "ARIZONA": "AZ", "ARKANSAS": "AR",
    "CALIFORNIA": "CA", "COLORADO": "CO", "CONNECTICUT": "CT", "DELAWARE": "DE",
    "FLORIDA": "FL", "GEORGIA": "GA", "HAWAII": "HI", "IDAHO": "ID",
    "ILLINOIS": "IL", "INDIANA": "IN", "IOWA": "IA", "KANSAS": "KS",
    "KENTUCKY": "KY", "LOUISIANA": "LA", "MAINE": "ME", "MARYLAND": "MD",
    "MASSACHUSETTS": "MA", "MICHIGAN": "MI", "MINNESOTA": "MN", "MISSISSIPPI": "MS",
    "MISSOURI": "MO", "MONTANA": "MT", "NEBRASKA": "NE", "NEVADA": "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", "OHIO": "OH", "OKLAHOMA": "OK",
    "OREGON": "OR", "PENNSYLVANIA": "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", "TENNESSEE": "TN", "TEXAS": "TX", "UTAH": "UT",
    "VERMONT": "VT", "VIRGINIA": "VA", "WASHINGTON": "WA", "WEST VIRGINIA": "WV",
    "WISCONSIN": "WI", "WYOMING": "WY",
  }
  const abbrev = stateAbbrevMap[normalized]
  if (abbrev) return STATE_TIMEZONE_MAP[abbrev] || null
  return null
}

// POST /api/portal/dialer/import - import CSV leads
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { leads, batchName } = body as {
    leads: {
      state?: string
      business_name?: string
      phone_number?: string
      owner_name?: string
      first_name?: string
      website?: string
    }[]
    batchName?: string
  }

  if (!leads?.length) {
    return NextResponse.json({ error: "No leads provided" }, { status: 400 })
  }

  const admin = getAdmin()
  const batch = batchName || new Date().toISOString()

  let imported = 0
  let duplicates = 0
  let updated = 0
  const errors: string[] = []

  for (const lead of leads) {
    if (!lead.phone_number) {
      errors.push(`Skipped lead with no phone number: ${lead.business_name || "unknown"}`)
      continue
    }

    const phone = normalizePhone(lead.phone_number)
    if (phone.length < 7) {
      errors.push(`Invalid phone number for ${lead.business_name || "unknown"}: ${lead.phone_number}`)
      continue
    }

    const state = lead.state?.trim().toUpperCase() || null
    const timezone = state ? getTimezone(state) : null

    // Check if phone already exists
    const { data: existing } = await admin
      .from("dialer_leads")
      .select("id, status")
      .eq("phone_number", phone)
      .single()

    if (existing) {
      // Update existing lead with new info (only if it's not completed/archived)
      if (existing.status === "completed" || existing.status === "archived") {
        duplicates++
        continue
      }

      await admin
        .from("dialer_leads")
        .update({
          state: lead.state?.trim() || undefined,
          business_name: lead.business_name?.trim() || undefined,
          owner_name: lead.owner_name?.trim() || undefined,
          first_name: lead.first_name?.trim() || undefined,
          website: lead.website?.trim() || undefined,
          timezone: timezone || undefined,
        })
        .eq("id", existing.id)

      updated++
      duplicates++
    } else {
      // Insert new lead
      const { error: insertError } = await admin.from("dialer_leads").insert({
        state: lead.state?.trim() || null,
        business_name: lead.business_name?.trim() || null,
        phone_number: phone,
        owner_name: lead.owner_name?.trim() || null,
        first_name: lead.first_name?.trim() || null,
        website: lead.website?.trim() || null,
        timezone,
        import_batch: batch,
      })

      if (insertError) {
        if (insertError.message.includes("unique")) {
          duplicates++
        } else {
          errors.push(`Error importing ${lead.business_name}: ${insertError.message}`)
        }
      } else {
        imported++
      }
    }
  }

  return NextResponse.json({ imported, duplicates, updated, errors })
}
