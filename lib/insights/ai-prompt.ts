/**
 * AI Prompt Builder — AI Insights Engine
 *
 * Builds system prompt + user message for Claude analysis.
 * Two modes: full analysis (structured JSON output) and chat (conversational).
 */

import type { DataSnapshot, AiInsightRow } from "./data-snapshot"

// ─── System Prompt ───────────────────────────────────────────────────────────

const ANALYSIS_SYSTEM_PROMPT = `You are the AI brain for HomeField Hub, an AI-powered lead generation agency for home service contractors based in Charlotte, NC. The owner, Anthony, does door-to-door sales AND cold calling to sign contractor clients.

Your job: analyze ALL the data — door knocking sessions, cold call history, territory performance, time patterns, weather — and produce actionable intelligence. You are Anthony's strategic advisor.

Key context:
- Anthony runs a pressure washing company (Dr. Squeegee) for bridge income while building the agency
- He does D2D sales (knocking on contractor doors) AND cold calls to roofing/home service companies
- He tracks door knocks by neighborhood, time, weather, and results
- He tracks cold calls by time, outcome, timezone, and lead info
- His territories are neighborhoods in the Charlotte, NC metro area
- His goal: sign enough clients to move from Charlotte to Brooklyn

Scoring territories (0-100 scale):
- Contact rate (doors opened / doors knocked) — weight 25%
- Pitch rate (pitches given / doors opened) — weight 20%
- Close rate (jobs closed / pitches given) — weight 30%
- Revenue per door (total revenue / total knocked) — weight 15%
- Recency (more recent = higher score) — weight 10%

Grades: A = 80-100, B = 65-79, C = 50-64, D = 35-49, F = 0-34

For cold calls, analyze:
- Best times of day (by outcome success rate)
- Best days of week
- Timezone effectiveness
- Outcome patterns (what percentage lead to conversations vs no answer)
- Pitch-to-demo conversion

Be specific. Use actual numbers from the data. Don't make up statistics. If data is limited, say so and adjust confidence accordingly.

You must respond with ONLY valid JSON matching the requested schema. No markdown. No code fences. No explanatory text.`

const CHAT_SYSTEM_PROMPT = `You are the AI brain for HomeField Hub, an AI-powered lead generation agency for home service contractors in Charlotte, NC. Anthony (the owner) is asking you a question about his sales data.

You have access to his complete door knocking history, cold call data, territory performance, and past AI analyses. Answer his question using the actual data provided. Be conversational but data-driven. Use specific numbers and percentages.

If you don't have enough data to answer confidently, say so. Don't make up statistics.

Format your response as clear, readable markdown. Use bullet points, bold text, and headers where appropriate. Keep it actionable — end with a recommendation when possible.`

// ─── Prompt Builders ─────────────────────────────────────────────────────────

function formatPastInsights(insights: AiInsightRow[]): string {
  if (insights.length === 0) return "No previous analyses available."

  return insights
    .map((ins, i) => {
      const date = new Date(ins.created_at).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
      const analysis = ins.analysis as Record<string, unknown>
      const summary = (analysis.summary as string) || "No summary"
      const trends = (analysis.trends as string) || ""
      const learningNotes = (analysis.learning_notes as string) || ""

      return `--- Analysis #${i + 1} (${date}, category: ${ins.category}) ---
Summary: ${summary}
${trends ? `Trends: ${trends}` : ""}
${learningNotes ? `Learning Notes: ${learningNotes}` : ""}`
    })
    .join("\n\n")
}

function buildSnapshotSummary(snapshot: DataSnapshot): string {
  const parts: string[] = []

  parts.push(`=== DATA SNAPSHOT (${snapshot.metadata.snapshot_date}) ===`)
  parts.push(
    `Total door knock sessions: ${snapshot.metadata.total_door_sessions}`
  )
  parts.push(`Total cold calls: ${snapshot.metadata.total_cold_calls}`)
  parts.push(`Days of data: ${snapshot.metadata.days_of_data}`)

  // Door knocking data
  parts.push(`\n=== DOOR KNOCKING DATA ===`)
  if (snapshot.door_knocking.sessions.length > 0) {
    parts.push(`\nRaw sessions (most recent first):`)
    parts.push(JSON.stringify(snapshot.door_knocking.sessions, null, 2))

    parts.push(`\nNeighborhood aggregates:`)
    parts.push(JSON.stringify(snapshot.door_knocking.aggregate, null, 2))

    parts.push(
      `\nTerritories tracked: ${snapshot.door_knocking.territory_doors.length} doors across ${snapshot.door_knocking.neighborhoods.length} neighborhoods`
    )
    parts.push(`Neighborhoods: ${snapshot.door_knocking.neighborhoods.join(", ")}`)
  } else {
    parts.push("No door knocking data yet.")
  }

  // Cold calling data
  parts.push(`\n=== COLD CALLING DATA ===`)
  if (snapshot.cold_calling.calls.length > 0) {
    parts.push(`\nOutcome distribution:`)
    parts.push(JSON.stringify(snapshot.cold_calling.outcome_distribution, null, 2))

    parts.push(`\nCalls by hour of day:`)
    parts.push(JSON.stringify(snapshot.cold_calling.calls_by_hour, null, 2))

    parts.push(`\nCalls by day of week:`)
    parts.push(JSON.stringify(snapshot.cold_calling.calls_by_day, null, 2))

    // Include recent call details (last 50 for context without overwhelming)
    const recentCalls = snapshot.cold_calling.calls.slice(0, 50)
    parts.push(`\nRecent calls (last ${recentCalls.length}):`)
    parts.push(JSON.stringify(recentCalls, null, 2))

    if (snapshot.cold_calling.daily_stats.length > 0) {
      parts.push(`\nDaily stats (last ${snapshot.cold_calling.daily_stats.length} days):`)
      parts.push(JSON.stringify(snapshot.cold_calling.daily_stats, null, 2))
    }
  } else {
    parts.push("No cold calling data yet.")
  }

  // Past insights
  parts.push(`\n=== PREVIOUS AI ANALYSES (for trend tracking) ===`)
  parts.push(formatPastInsights(snapshot.past_insights))

  return parts.join("\n")
}

export function buildAnalysisPrompt(
  snapshot: DataSnapshot,
  category?: string
): { system: string; user: string } {
  const snapshotText = buildSnapshotSummary(snapshot)
  const categoryNote = category
    ? `Focus your analysis on: ${category}. Still reference other data for context.`
    : "Analyze ALL data — door knocking AND cold calling together."

  const userPrompt = `${snapshotText}

=== INSTRUCTIONS ===
${categoryNote}

Analyze all the data above and return a JSON object with this exact structure:
{
  "summary": "One-paragraph executive summary of current performance, what's working, what needs attention",
  "territory_rankings": [
    {
      "neighborhood": "Name",
      "score": 82,
      "grade": "A",
      "reasoning": "Why this score",
      "recommendation": "Specific action to take",
      "kpis": {
        "contact_rate": 0.35,
        "pitch_rate": 0.60,
        "close_rate": 0.50,
        "rpd": 35.29,
        "rph": 400
      }
    }
  ],
  "cold_call_insights": {
    "best_times": ["10:00-11:30 AM ET"],
    "best_days": ["Tuesday", "Wednesday"],
    "conversion_patterns": "What patterns lead to conversions",
    "pitch_recommendations": "How to improve pitch"
  },
  "door_knock_insights": {
    "best_neighborhoods": ["Name1", "Name2"],
    "best_times": ["3:00-6:00 PM weekdays"],
    "weather_impact": "How weather affects results",
    "recommendations": ["Specific action 1", "Specific action 2"]
  },
  "action_items": [
    "Most important thing to do right now",
    "Second priority",
    "Third priority"
  ],
  "trends": "Compared to previous analyses — what changed, what's improving, what's declining",
  "learning_notes": "New patterns discovered that should be remembered for future analyses"
}

If there's not enough data for certain sections (e.g., only 1 door knock session), still provide the structure but note low confidence and suggest what data would help.

Here are your previous analyses. Identify what changed, what trends are emerging, and whether your past recommendations played out.`

  return { system: ANALYSIS_SYSTEM_PROMPT, user: userPrompt }
}

export function buildChatPrompt(
  snapshot: DataSnapshot,
  question: string
): { system: string; user: string } {
  const snapshotText = buildSnapshotSummary(snapshot)

  const userPrompt = `${snapshotText}

=== ANTHONY'S QUESTION ===
${question}

Answer this question using the data above. Be specific, use actual numbers, and end with an actionable recommendation.`

  return { system: CHAT_SYSTEM_PROMPT, user: userPrompt }
}
