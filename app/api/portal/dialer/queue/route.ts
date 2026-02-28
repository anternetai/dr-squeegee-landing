import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import {
  TIMEZONE_SCHEDULE,
  getCurrentETHour,
  getTimezoneForHour,
  type DialerTimezone,
  type DialerLead,
} from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/queue - get the current call queue
export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = getAdmin()
  const url = new URL(req.url)
  const forceTimezone = url.searchParams.get("timezone") as DialerTimezone | null
  const limit = parseInt(url.searchParams.get("limit") || "500")

  const etHour = getCurrentETHour()
  const currentTimezone = forceTimezone || getTimezoneForHour(etHour)
  const schedule = TIMEZONE_SCHEDULE.find((s) => s.etHour === etHour)

  const today = new Date().toISOString().split("T")[0]
  const now = new Date().toISOString()
  const todayStart = `${today}T00:00:00.000Z`

  // 1. Get callbacks due now or overdue
  const { data: callbacks } = await admin
    .from("dialer_leads")
    .select("*")
    .eq("status", "callback")
    .lte("next_call_at", now)
    .lt("attempt_count", 5)
    .order("next_call_at", { ascending: true })
    .limit(20)

  // 2. Get queued leads for current timezone
  // Filter out leads already called today — forces queue to progress
  let queueQuery = admin
    .from("dialer_leads")
    .select("*")
    .eq("status", "queued")
    .lt("attempt_count", 5)
    .or(`next_call_at.is.null,next_call_at.lte.${now}`)
    .or(`last_called_at.is.null,last_called_at.lt.${todayStart}`)
    .order("attempt_count", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit)

  if (currentTimezone) {
    queueQuery = queueQuery.eq("timezone", currentTimezone)
  }

  const { data: queueLeads } = await queueQuery

  // Combine: callbacks first, then queued leads
  const allCallbacks = (callbacks || []) as DialerLead[]
  const allQueued = (queueLeads || []) as DialerLead[]

  // Remove duplicates (callback might also appear in queued)
  const seenIds = new Set(allCallbacks.map((l) => l.id))
  const dedupedQueued = allQueued.filter((l) => !seenIds.has(l.id))
  const leads = [...allCallbacks, ...dedupedQueued]

  // 3. Get today's progress
  const { count: completedToday } = await admin
    .from("dialer_call_history")
    .select("*", { count: "exact", head: true })
    .eq("call_date", today)

  // 4. Get total callable leads for today
  const { count: totalToday } = await admin
    .from("dialer_leads")
    .select("*", { count: "exact", head: true })
    .in("status", ["queued", "callback", "in_progress"])
    .lt("attempt_count", 5)

  // 5. Callbacks due today
  const endOfDay = new Date()
  endOfDay.setHours(23, 59, 59, 999)
  const { data: callbacksDueToday } = await admin
    .from("dialer_leads")
    .select("*")
    .eq("status", "callback")
    .lte("next_call_at", endOfDay.toISOString())
    .lt("attempt_count", 5)
    .order("next_call_at", { ascending: true })

  // 6. Breakdown by timezone
  const breakdownByTimezone: Record<DialerTimezone, number> = { ET: 0, CT: 0, MT: 0, PT: 0 }
  for (const tz of ["ET", "CT", "MT", "PT"] as DialerTimezone[]) {
    const { count } = await admin
      .from("dialer_leads")
      .select("*", { count: "exact", head: true })
      .in("status", ["queued", "callback"])
      .eq("timezone", tz)
      .lt("attempt_count", 5)
    breakdownByTimezone[tz] = count || 0
  }

  // 7. Select best outbound number from pool
  let selectedNumber: any = null
  try {
    const { data: availableNumbers } = await admin
      .from("dialer_phone_numbers")
      .select("*")
      .eq("status", "active")
      .order("calls_this_hour", { ascending: true })

    if (availableNumbers && availableNumbers.length > 0) {
      // Filter out numbers at max capacity
      const eligible = availableNumbers.filter(
        (n: any) => n.calls_this_hour < (n.max_calls_per_hour || 20)
      )

      if (eligible.length > 0) {
        // Prefer area code matching current lead's state
        const currentLeadState = leads.length > 0 ? leads[0].state : null
        if (currentLeadState) {
          const stateMatch = eligible.find(
            (n: any) => n.state && n.state.toUpperCase() === currentLeadState.toUpperCase()
          )
          if (stateMatch) {
            selectedNumber = stateMatch
          }
        }
        // Fallback: pick number with fewest calls this hour
        if (!selectedNumber) {
          selectedNumber = eligible[0]
        }
      }
    }
  } catch (err) {
    console.error("Phone number rotation error:", err)
  }

  return NextResponse.json({
    leads,
    totalToday: totalToday || 0,
    completedToday: completedToday || 0,
    currentTimezone,
    currentHourBlock: schedule?.label || null,
    callbacksDue: (callbacksDueToday || []) as DialerLead[],
    breakdownByTimezone,
    selectedNumber: selectedNumber
      ? {
          id: selectedNumber.id,
          phone_number: selectedNumber.phone_number,
          friendly_name: selectedNumber.friendly_name,
          area_code: selectedNumber.area_code,
          calls_this_hour: selectedNumber.calls_this_hour,
          max_calls_per_hour: selectedNumber.max_calls_per_hour,
        }
      : null,
  })
}
