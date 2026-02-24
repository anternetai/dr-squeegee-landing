import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/portal/dialer/webrtc-token
 * 
 * Returns Telnyx SIP credentials for WebRTC browser calling.
 * The client uses these to connect via @telnyx/webrtc SDK.
 */
export async function GET() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const login = process.env.TELNYX_SIP_USERNAME
  const password = process.env.TELNYX_SIP_PASSWORD
  const callerIdNumber = process.env.TELNYX_PHONE_NUMBER

  if (!login || !password) {
    return NextResponse.json(
      { error: "Telnyx WebRTC not configured. Set TELNYX_SIP_USERNAME and TELNYX_SIP_PASSWORD." },
      { status: 500 }
    )
  }

  return NextResponse.json({
    login,
    password,
    callerIdNumber: callerIdNumber || null,
    connectionId: process.env.TELNYX_CONNECTION_ID || null,
  })
}
