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
  const apiKeySid = process.env.TWILIO_API_KEY
  const apiKeySecret = process.env.TWILIO_API_SECRET

  if (!accountSid) {
    return NextResponse.json(
      {
        error: "Twilio not configured",
        configured: false,
        missing: ["TWILIO_ACCOUNT_SID"],
      },
      { status: 200 }
    )
  }

  // We need either API Key + Secret OR Account SID + Auth Token
  const hasApiKey = !!(apiKeySid && apiKeySecret)
  const hasAuthToken = !!authToken

  if (!hasApiKey && !hasAuthToken) {
    return NextResponse.json(
      {
        error: "Twilio credentials missing",
        configured: false,
        missing: [
          "TWILIO_API_KEY + TWILIO_API_SECRET (recommended)",
          "or TWILIO_AUTH_TOKEN (fallback)",
        ],
      },
      { status: 200 }
    )
  }

  // Warn if API Secret is present but API Key SID is missing
  if (apiKeySecret && !apiKeySid) {
    return NextResponse.json(
      {
        error: "TWILIO_API_SECRET is set but TWILIO_API_KEY (SK...) is missing. Both are required.",
        configured: false,
        missing: ["TWILIO_API_KEY"],
        hint: "The API Key SID starts with SK... — find it at https://console.twilio.com/us1/account/keys",
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
      // Try to auto-create a TwiML app using REST API
      // This requires either auth token or API key for REST auth
      const restUser = apiKeySid || accountSid
      const restPass = apiKeySid ? apiKeySecret! : authToken!

      try {
        const client = twilio.default(restUser, restPass, { accountSid })
        const app = await client.applications.create({
          friendlyName: "HomeField Hub Power Dialer",
          voiceMethod: "POST",
          voiceUrl: `${process.env.NEXT_PUBLIC_APP_URL || "https://homefieldhub.com"}/api/portal/dialer/twiml`,
        })
        appSid = app.sid
        console.log(`Created TwiML App: ${appSid} — set TWILIO_TWIML_APP_SID=${appSid}`)
      } catch (createErr: any) {
        console.error("Failed to auto-create TwiML app:", createErr.message)
        return NextResponse.json(
          {
            error: `TwiML App not configured and auto-creation failed: ${createErr.message}`,
            configured: false,
            missing: ["TWILIO_TWIML_APP_SID"],
            hint: "Create a TwiML App at https://console.twilio.com → Voice → TwiML Apps with Voice URL: https://homefieldhub.com/api/portal/dialer/twiml",
          },
          { status: 200 }
        )
      }
    }

    // Generate access token
    // Use API Key + Secret if available (recommended), fall back to account credentials
    const tokenApiKey = apiKeySid || accountSid
    const tokenApiSecret = apiKeySid ? apiKeySecret! : authToken!

    const token = new AccessToken(accountSid, tokenApiKey, tokenApiSecret, {
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
