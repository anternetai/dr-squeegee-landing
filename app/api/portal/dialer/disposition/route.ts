import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import type { DialerOutcome } from "@/lib/dialer/types"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/dialer/disposition - log a call disposition
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { leadId, outcome, notes, demoDate, callbackAt, callerNumberId } = body as {
    leadId: string
    outcome: DialerOutcome
    notes?: string
    demoDate?: string
    callbackAt?: string
    callerNumberId?: string
  }

  if (!leadId || !outcome) {
    return NextResponse.json({ error: "leadId and outcome are required" }, { status: 400 })
  }

  const admin = getAdmin()

  // Handle autosave — only update notes, don't touch disposition/stats
  if (body.autosave) {
    const { data: lead } = await admin
      .from("dialer_leads")
      .select("notes")
      .eq("id", leadId)
      .single()

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 })
    }

    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
    const noteEntry = notes ? `[${dateStr}] draft: ${notes}` : null
    if (noteEntry) {
      await admin
        .from("dialer_leads")
        .update({ notes: noteEntry })
        .eq("id", leadId)
    }

    return NextResponse.json({ success: true, autosaved: true })
  }

  // 1. Get current lead
  const { data: lead, error: leadError } = await admin
    .from("dialer_leads")
    .select("*")
    .eq("id", leadId)
    .single()

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 })
  }

  const newAttemptCount = (lead.attempt_count || 0) + 1
  const now = new Date().toISOString()

  // 2. Determine new status based on outcome
  let newStatus = "queued"
  let nextCallAt: string | null = null
  let demoBooked = lead.demo_booked
  let demoDateVal = lead.demo_date
  let notInterested = lead.not_interested
  let wrongNumber = lead.wrong_number

  switch (outcome) {
    case "no_answer":
    case "voicemail":
    case "gatekeeper": {
      const daysDelay = 2 + Math.random()
      const next = new Date(Date.now() + daysDelay * 86400000)
      nextCallAt = next.toISOString()
      newStatus = newAttemptCount >= lead.max_attempts ? "archived" : "queued"
      break
    }
    case "conversation": {
      newStatus = newAttemptCount >= lead.max_attempts ? "archived" : "queued"
      const next = new Date(Date.now() + 3 * 86400000)
      nextCallAt = next.toISOString()
      break
    }
    case "demo_booked": {
      newStatus = "completed"
      demoBooked = true
      demoDateVal = demoDate || null
      break
    }
    case "not_interested": {
      newStatus = "completed"
      notInterested = true
      break
    }
    case "wrong_number": {
      newStatus = "completed"
      wrongNumber = true
      break
    }
    case "callback": {
      newStatus = "callback"
      nextCallAt = callbackAt || new Date(Date.now() + 86400000).toISOString()
      break
    }
  }

  // Append notes
  const existingNotes = lead.notes || ""
  const dateStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
  const noteEntry = notes ? `[${dateStr}] ${outcome}: ${notes}` : `[${dateStr}] ${outcome}`
  const updatedNotes = existingNotes ? `${existingNotes}\n${noteEntry}` : noteEntry

  // 3. Update the lead
  const { error: updateError } = await admin
    .from("dialer_leads")
    .update({
      status: newStatus,
      attempt_count: newAttemptCount,
      last_called_at: now,
      last_outcome: outcome,
      next_call_at: nextCallAt,
      demo_booked: demoBooked,
      demo_date: demoDateVal,
      not_interested: notInterested,
      wrong_number: wrongNumber,
      notes: updatedNotes,
    })
    .eq("id", leadId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // 4. Log call history
  await admin.from("dialer_call_history").insert({
    lead_id: leadId,
    attempt_number: newAttemptCount,
    outcome,
    notes: notes || null,
    demo_date: demoDate || null,
    callback_at: callbackAt || null,
  })

  // 5. Also log to existing call_logs table for dashboard stats
  const contactMade = ["conversation", "demo_booked", "callback", "not_interested"].includes(outcome)
  const isConversation = ["conversation", "demo_booked"].includes(outcome)

  await admin.from("call_logs").insert({
    business_name: lead.business_name,
    phone_number: lead.phone_number,
    contact_made: contactMade,
    conversation: isConversation,
    demo_booked: outcome === "demo_booked",
    outcome,
    notes: notes || null,
    lead_id: leadId,
  })

  // 6. Update daily_call_stats
  const today = new Date().toISOString().split("T")[0]
  const { data: todayStats } = await admin
    .from("daily_call_stats")
    .select("*")
    .eq("call_date", today)
    .single()

  if (todayStats) {
    await admin
      .from("daily_call_stats")
      .update({
        total_dials: (todayStats.total_dials || 0) + 1,
        contacts: (todayStats.contacts || 0) + (contactMade ? 1 : 0),
        conversations: (todayStats.conversations || 0) + (isConversation ? 1 : 0),
        demos_booked: (todayStats.demos_booked || 0) + (outcome === "demo_booked" ? 1 : 0),
      })
      .eq("call_date", today)
  } else {
    await admin.from("daily_call_stats").insert({
      call_date: today,
      total_dials: 1,
      contacts: contactMade ? 1 : 0,
      conversations: isConversation ? 1 : 0,
      demos_booked: outcome === "demo_booked" ? 1 : 0,
    })
  }

  // 7. Update phone number rotation counters
  if (callerNumberId) {
    try {
      const { data: phoneNum } = await admin
        .from("dialer_phone_numbers")
        .select("*")
        .eq("id", callerNumberId)
        .single()

      if (phoneNum) {
        const newHourly = (phoneNum.calls_this_hour || 0) + 1
        const newDaily = (phoneNum.calls_today || 0) + 1
        const newTotal = (phoneNum.total_calls || 0) + 1
        const maxPerHour = phoneNum.max_calls_per_hour || 20

        // Determine if this number needs to cool down
        const newPhoneStatus = newHourly >= maxPerHour ? "cooling" : phoneNum.status

        await admin
          .from("dialer_phone_numbers")
          .update({
            calls_this_hour: newHourly,
            calls_today: newDaily,
            total_calls: newTotal,
            last_used_at: now,
            status: newPhoneStatus,
          })
          .eq("id", callerNumberId)

        // Auto-retire if too many spam reports
        if ((phoneNum.spam_reports || 0) > 2 && phoneNum.status !== "retired") {
          await admin
            .from("dialer_phone_numbers")
            .update({ status: "retired" })
            .eq("id", callerNumberId)
        }
      }
    } catch (err) {
      console.error("Failed to update phone number counters:", err)
    }
  }

  return NextResponse.json({ success: true, newStatus, attemptCount: newAttemptCount })
}
