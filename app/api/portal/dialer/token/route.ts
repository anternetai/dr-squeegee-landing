import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/portal/dialer/token - generate Twilio capability token for browser
export async function GET() {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken) {
    return NextResponse.json(
      {
        error: "Twilio not configured",
        configured: false,
        missing: [
          ...(!accountSid ? ["TWILIO_ACCOUNT_SID"] : []),
          ...(!authToken ? ["TWILIO_AUTH_TOKEN"] : []),
        ],
      },
      { status: 200 }
    )
  }

  try {
    // Dynamic import to avoid errors when twilio isn't needed
    const twilio = await import("twilio")
    const { AccessToken } = twilio.jwt
    const { VoiceGrant } = AccessToken

    // Create or use existing TwiML app
    let appSid = twimlAppSid

    if (!appSid) {
      // Auto-create a TwiML app
      const client = twilio.default(accountSid, authToken)
      const app = await client.applications.create({
        friendlyName: "HomeField Hub Power Dialer",
        voiceMethod: "POST",
        voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://homefieldhub.com"}/api/portal/dialer/twiml`,
      })
      appSid = app.sid
      // Note: User should set TWILIO_TWIML_APP_SID env var to this value
      console.log(`Created TwiML App: ${appSid} — set TWILIO_TWIML_APP_SID=${appSid}`)
    }

    // Generate access token
    // For Twilio Voice SDK, we need API Key & Secret or use the main account credentials
    // Using the Access Token approach with the account SID and auth token
    const apiKey = process.env.TWILIO_API_KEY || accountSid
    const apiSecret = process.env.TWILIO_API_SECRET || authToken

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity: user.id,
      ttl: 3600, // 1 hour
    })

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: false,
    })

    token.addGrant(voiceGrant)

    return NextResponse.json({
      configured: true,
      token: token.toJwt(),
      identity: user.id,
      phoneNumber,
      twimlAppSid: appSid,
    })
  } catch (err: any) {
    console.error("Twilio token error:", err)
    return NextResponse.json(
      { error: err.message || "Failed to generate token", configured: false },
      { status: 500 }
    )
  }
}
