import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { STATE_TIMEZONE_MAP } from "@/lib/dialer/types"

import * as crypto from "crypto"

const SHEET_ID = "1Qk-ExdMeClYY9XY_aArZOMVtMVBgQ3SU3wR1c4rLpIU"
const SHEET_NAME =
  "Cold Call List Roofers - Untitled spreadsheet - Cold Call List - With-Websites (1)"

// Lightweight JWT auth for Google service account (no googleapis dependency)
async function getGoogleAccessToken(): Promise<string | null> {
  try {
    const fs = await import("fs")
    const creds = JSON.parse(
      fs.readFileSync("/data/workspace/google-service-account.json", "utf-8")
    )

    const now = Math.floor(Date.now() / 1000)
    const header = Buffer.from(
      JSON.stringify({ alg: "RS256", typ: "JWT" })
    ).toString("base64url")
    const payload = Buffer.from(
      JSON.stringify({
        iss: creds.client_email,
        scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
        aud: "https://oauth2.googleapis.com/token",
        iat: now,
        exp: now + 3600,
      })
    ).toString("base64url")

    const signable = `${header}.${payload}`
    const sign = crypto.createSign("RSA-SHA256")
    sign.update(signable)
    const signature = sign.sign(creds.private_key, "base64url")

    const jwt = `${signable}.${signature}`

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
    })

    if (!tokenRes.ok) {
      console.error("Token exchange failed:", await tokenRes.text())
      return null
    }

    const tokenData = await tokenRes.json()
    return tokenData.access_token
  } catch (err) {
    console.error("Auth error:", err)
    return null
  }
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return digits
}

function getTimezoneFromState(state: string): string | null {
  // Try abbreviation first
  const upper = state.trim().toUpperCase()
  if (upper.length === 2 && STATE_TIMEZONE_MAP[upper]) return STATE_TIMEZONE_MAP[upper]

  // Full state name → abbreviation
  const stateMap: Record<string, string> = {
    ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR",
    CALIFORNIA: "CA", COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE",
    FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID",
    ILLINOIS: "IL", INDIANA: "IN", IOWA: "IA", KANSAS: "KS",
    KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD",
    MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS",
    MISSOURI: "MO", MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV",
    "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ", "NEW MEXICO": "NM", "NEW YORK": "NY",
    "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND", OHIO: "OH", OKLAHOMA: "OK",
    OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI", "SOUTH CAROLINA": "SC",
    "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
    VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV",
    WISCONSIN: "WI", WYOMING: "WY",
  }
  const abbrev = stateMap[upper]
  if (abbrev) return STATE_TIMEZONE_MAP[abbrev] || null
  return null
}

// POST /api/portal/cold-calls/sync — sync Google Sheet leads → Supabase dialer_leads
export async function POST() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    // 1. Get access token from service account
    const accessToken = await getGoogleAccessToken()
    if (!accessToken) {
      return NextResponse.json(
        { error: "Failed to authenticate with Google" },
        { status: 500 }
      )
    }

    // 2. Fetch all rows from the sheet via REST API
    const encodedRange = encodeURIComponent(`'${SHEET_NAME}'!A1:Z10000`)
    const sheetsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodedRange}`
    const sheetResponse = await fetch(sheetsUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!sheetResponse.ok) {
      const errText = await sheetResponse.text()
      return NextResponse.json(
        { error: `Google Sheets API error: ${errText}` },
        { status: 500 }
      )
    }

    const sheetData = await sheetResponse.json()
    const rows = sheetData.values as string[][] | undefined
    if (!rows || rows.length < 2) {
      return NextResponse.json({ error: "No data found in sheet" }, { status: 404 })
    }

    // Headers: [state, profileLink/website, businessName, phone, ownerName, firstName, lastName,
    //           answered, outcome, date, note, ..., ownerConvo, pitch, booked, ..., phoneType]
    const headers = rows[0]
    const dataRows = rows.slice(1)

    const admin = getAdmin()
    let imported = 0
    let duplicates = 0
    let skipped = 0
    let errors: string[] = []

    // Process in batches of 50 for upsert
    const leadsToUpsert: Array<Record<string, unknown>> = []

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i]
      const state = (row[0] || "").trim()
      const website = (row[1] || "").trim()
      const businessName = (row[2] || "").trim()
      const phone = (row[3] || "").trim()
      const ownerName = (row[4] || "").trim()
      const firstName = (row[5] || "").trim()
      const answered = (row[7] || "").trim().toLowerCase()
      const outcome = (row[8] || "").trim()
      const callDate = (row[9] || "").trim()
      const note = (row[10] || "").trim()

      if (!phone) {
        skipped++
        continue
      }

      const normalizedPhone = normalizePhone(phone)
      if (normalizedPhone.length < 7) {
        skipped++
        continue
      }

      if (!businessName) {
        skipped++
        continue
      }

      const timezone = state ? getTimezoneFromState(state) : null

      // Determine existing status from sheet outcome
      let sheetStatus = "queued"
      let notInterested = false
      let wrongNumber = false
      let demoBooked = false
      const lowerOutcome = outcome.toLowerCase()

      if (lowerOutcome.includes("not interested") || lowerOutcome.includes("not a match")) {
        sheetStatus = "completed"
        notInterested = true
      } else if (lowerOutcome.includes("wrong number") || lowerOutcome.includes("wrong")) {
        sheetStatus = "completed"
        wrongNumber = true
      } else if (lowerOutcome.includes("booked") || lowerOutcome.includes("demo")) {
        sheetStatus = "completed"
        demoBooked = true
      } else if (answered === "y" && outcome) {
        // Has been called with a result — still queued for follow-up unless completed
        sheetStatus = "queued"
      }

      // Build notes from sheet data
      const notesParts: string[] = []
      if (note) notesParts.push(note)
      if (outcome && callDate) notesParts.push(`[Sheet ${callDate}] ${outcome}`)
      else if (outcome) notesParts.push(`[Sheet] ${outcome}`)

      leadsToUpsert.push({
        phone_number: normalizedPhone,
        business_name: businessName,
        owner_name: ownerName || null,
        first_name: firstName || null,
        website: website || null,
        state: state || null,
        timezone,
        status: sheetStatus,
        not_interested: notInterested,
        wrong_number: wrongNumber,
        demo_booked: demoBooked,
        notes: notesParts.join("\n") || null,
        import_batch: "google-sheets-sync",
        sheet_row_id: `row-${i + 2}`,
      })
    }

    // Batch upsert — check for existing leads by phone
    for (let i = 0; i < leadsToUpsert.length; i += 50) {
      const batch = leadsToUpsert.slice(i, i + 50)

      for (const lead of batch) {
        const { data: existing } = await admin
          .from("dialer_leads")
          .select("id, status")
          .eq("phone_number", lead.phone_number as string)
          .single()

        if (existing) {
          // Only update if not already completed/archived in our system
          if (existing.status !== "completed" && existing.status !== "archived") {
            await admin
              .from("dialer_leads")
              .update({
                business_name: lead.business_name,
                owner_name: lead.owner_name,
                first_name: lead.first_name,
                website: lead.website,
                state: lead.state,
                timezone: lead.timezone,
                sheet_row_id: lead.sheet_row_id,
              })
              .eq("id", existing.id)
          }
          duplicates++
        } else {
          const { error: insertError } = await admin
            .from("dialer_leads")
            .insert(lead)

          if (insertError) {
            if (insertError.message.includes("unique")) {
              duplicates++
            } else {
              errors.push(
                `Row ${lead.sheet_row_id}: ${insertError.message}`
              )
            }
          } else {
            imported++
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalRows: dataRows.length,
      imported,
      duplicates,
      skipped,
      errors: errors.slice(0, 20),
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Sync error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
