import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

/**
 * GET /api/portal/dialer/webrtc-token
 * 
 * Generates a fresh JWT access token for Telnyx WebRTC browser calling.
 * Uses a telephony_credential tied to the credential connection.
 * The client uses this JWT with `login_token` in the @telnyx/webrtc SDK.
 */
export async function GET() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const apiKey = process.env.TELNYX_API_KEY
  const credentialId = process.env.TELNYX_CREDENTIAL_ID
  const callerIdNumber = process.env.TELNYX_PHONE_NUMBER

  if (!apiKey || !credentialId) {
    return NextResponse.json(
      { error: "Telnyx WebRTC not configured. Set TELNYX_API_KEY and TELNYX_CREDENTIAL_ID." },
      { status: 500 }
    )
  }

  try {
    // Generate a fresh JWT from the telephony credential
    const tokenRes = await fetch(
      `https://api.telnyx.com/v2/telephony_credentials/${credentialId}/token`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    )

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      console.error("Telnyx token error:", tokenRes.status, errText)
      return NextResponse.json(
        { error: `Failed to generate WebRTC token: ${tokenRes.status}` },
        { status: 500 }
      )
    }

    const loginToken = await tokenRes.text()

    return NextResponse.json({
      login_token: loginToken,
      callerIdNumber: callerIdNumber || null,
      connectionId: process.env.TELNYX_CONNECTION_ID || null,
    })
  } catch (err) {
    console.error("WebRTC token generation error:", err)
    return NextResponse.json(
      { error: "Failed to generate WebRTC token" },
      { status: 500 }
    )
  }
}
