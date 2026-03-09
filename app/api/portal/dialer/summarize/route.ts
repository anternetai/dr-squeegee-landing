import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// POST /api/portal/dialer/summarize - AI-analyze a call transcript
export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const {
    transcript,
    businessName,
    leadContext,
    leadId,
    phoneNumber,
    durationSeconds,
  } = body as {
    transcript: string
    businessName?: string
    leadContext?: string
    leadId?: string
    phoneNumber?: string
    durationSeconds?: number
  }

  if (!transcript || transcript.trim().length < 10) {
    return NextResponse.json({
      summary: null,
      disposition: null,
      notes: null,
      keyPoints: [],
      saved: false,
      reason: "Transcript too short for analysis",
    })
  }

  const admin = getAdmin()
  const apiKey = process.env.ANTHROPIC_API_KEY

  let aiResult: {
    summary: string
    disposition: string
    notes: string
    keyPoints: string[]
    objections: string[]
    nextSteps: string[]
  } | null = null

  if (apiKey) {
    try {
      const prompt = `You are a cold call analyst. Summarize this cold call transcript.

Business: ${businessName || "Unknown"}
${leadContext ? `Lead Context: ${leadContext}` : ""}

Transcript:
${transcript}

Extract the following in JSON format:
{
  "disposition": "<one of: no_answer, voicemail, conversation, demo_booked, not_interested, callback, wrong_number>",
  "summary": "<2-3 sentence summary of the call>",
  "keyPoints": ["<key discussion point 1>", "<key discussion point 2>"],
  "objections": ["<objection 1>", "<objection 2>"],
  "nextSteps": ["<next step 1>", "<next step 2>"],
  "notes": "<brief notes for the lead file>"
}

If the transcript is unclear or very short, use your best judgment. Respond ONLY with valid JSON.`

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: prompt }],
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const text =
          data.content?.[0]?.text || ""

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          aiResult = JSON.parse(jsonMatch[0])
        }
      } else {
        console.error("Anthropic API error:", response.status, await response.text())
      }
    } catch (err) {
      console.error("AI summarization error:", err)
    }
  }

  // Save transcript to database
  let saved = false
  try {
    const { error } = await admin.from("call_transcripts").insert({
      lead_id: leadId || null,
      phone_number: phoneNumber || null,
      duration_seconds: durationSeconds || null,
      raw_transcript: transcript,
      ai_summary: aiResult?.summary || null,
      ai_disposition: aiResult?.disposition || null,
      ai_notes: aiResult?.notes || null,
    })

    if (error) {
      console.error("Failed to save transcript:", error)
    } else {
      saved = true
    }
  } catch (err) {
    console.error("Transcript save error:", err)
  }

  return NextResponse.json({
    summary: aiResult?.summary || null,
    disposition: aiResult?.disposition || null,
    notes: aiResult?.notes || null,
    keyPoints: aiResult?.keyPoints || [],
    objections: aiResult?.objections || [],
    nextSteps: aiResult?.nextSteps || [],
    saved,
    hasAI: !!apiKey,
  })
}
