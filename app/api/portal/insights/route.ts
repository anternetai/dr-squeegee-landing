/**
 * AI Insights API — Trigger analysis & fetch past insights
 *
 * POST — Trigger a new AI analysis
 * GET  — Fetch past insights (optionally filtered by category)
 */

import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"
import { buildDataSnapshot } from "@/lib/insights/data-snapshot"
import { buildAnalysisPrompt } from "@/lib/insights/ai-prompt"

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function callClaude(
  system: string,
  userMessage: string
): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error("[insights] No ANTHROPIC_API_KEY configured")
    return null
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  })

  if (!res.ok) {
    console.error("[insights] Anthropic error:", res.status, await res.text())
    return null
  }

  const data = await res.json()
  return data.content?.[0]?.text ?? null
}

// ─── POST: Trigger new analysis ──────────────────────────────────────────────

const ADMIN_ID = "bba79829-7852-4f81-aa2e-393650138e7c"

export async function POST(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const category = (body.category as string) || "overall"

  // Build data snapshot
  const snapshot = await buildDataSnapshot(category)

  // Build prompt
  const { system, user: userPrompt } = buildAnalysisPrompt(snapshot, category)

  // Call Claude
  const rawResponse = await callClaude(system, userPrompt)
  if (!rawResponse) {
    return NextResponse.json(
      { error: "AI analysis failed — check API key" },
      { status: 500 }
    )
  }

  // Parse the JSON response
  let analysis: Record<string, unknown>
  try {
    // Strip any markdown code fences if present
    const cleaned = rawResponse
      .replace(/^```json?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
    analysis = JSON.parse(cleaned)
  } catch {
    console.error("[insights] Failed to parse AI response:", rawResponse.slice(0, 500))
    return NextResponse.json(
      { error: "AI returned invalid JSON", raw: rawResponse.slice(0, 1000) },
      { status: 500 }
    )
  }

  // Store in database
  const admin = getAdmin()
  const { data: insight, error } = await admin
    .from("ai_insights")
    .insert({
      category,
      trigger: "manual",
      data_snapshot: snapshot,
      analysis,
      raw_response: rawResponse,
    })
    .select()
    .single()

  if (error) {
    console.error("[insights] DB insert error:", error)
    return NextResponse.json(
      { error: "Failed to store analysis" },
      { status: 500 }
    )
  }

  return NextResponse.json(insight)
}

// ─── GET: Fetch past insights ────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const auth = await createServerClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user || user.id !== ADMIN_ID) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")
  const limit = parseInt(searchParams.get("limit") || "10", 10)

  const admin = getAdmin()
  let query = admin
    .from("ai_insights")
    .select("id, category, trigger, analysis, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (category) {
    query = query.eq("category", category)
  }

  const { data, error } = await query

  if (error) {
    console.error("[insights] DB fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch insights" },
      { status: 500 }
    )
  }

  return NextResponse.json(data)
}
