"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Brain,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Trophy,
  Zap,
  TrendingUp,
  MessageSquare,
} from "lucide-react"

interface TerritoryRanking {
  neighborhood: string
  score: number
  grade: string
  reasoning: string
  recommendation: string
  kpis?: {
    contact_rate?: number
    pitch_rate?: number
    close_rate?: number
    rpd?: number
    rph?: number
  }
}

interface InsightAnalysis {
  summary?: string
  territory_rankings?: TerritoryRanking[]
  cold_call_insights?: {
    best_times?: string[]
    best_days?: string[]
    conversion_patterns?: string
    pitch_recommendations?: string
  }
  door_knock_insights?: {
    best_neighborhoods?: string[]
    best_times?: string[]
    weather_impact?: string
    recommendations?: string[]
  }
  action_items?: string[]
  trends?: string
  learning_notes?: string
}

interface InsightRecord {
  id: string
  category: string
  analysis: InsightAnalysis
  created_at: string
}

function gradeColor(grade: string): string {
  switch (grade) {
    case "A":
      return "text-emerald-400"
    case "B":
      return "text-amber-400"
    case "C":
      return "text-orange-400"
    case "D":
      return "text-red-400"
    default:
      return "text-red-500"
  }
}

function gradeBg(grade: string): string {
  switch (grade) {
    case "A":
      return "bg-emerald-500/10 border-emerald-500/30"
    case "B":
      return "bg-amber-500/10 border-amber-500/30"
    case "C":
      return "bg-orange-500/10 border-orange-500/30"
    case "D":
      return "bg-red-500/10 border-red-500/30"
    default:
      return "bg-red-500/10 border-red-500/30"
  }
}

export function InsightsCard() {
  const [insight, setInsight] = useState<InsightRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchLatest() {
    setLoading(true)
    try {
      const res = await fetch("/api/portal/insights?limit=1")
      if (res.ok) {
        const data = await res.json()
        if (data.length > 0) setInsight(data[0])
      }
    } catch {
      // silent fail on fetch
    } finally {
      setLoading(false)
    }
  }

  async function triggerAnalysis() {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "overall" }),
      })
      if (res.ok) {
        const data = await res.json()
        setInsight(data)
      } else {
        const err = await res.json()
        setError(err.error || "Analysis failed")
      }
    } catch {
      setError("Network error")
    } finally {
      setAnalyzing(false)
    }
  }

  useEffect(() => {
    fetchLatest()
  }, [])

  const analysis = insight?.analysis
  const timeAgo = insight
    ? getTimeAgo(new Date(insight.created_at))
    : null

  if (loading) {
    return (
      <div className="rounded-2xl border border-stone-800/50 bg-stone-900/80 p-5">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-amber-400 animate-pulse" />
          <span className="text-sm text-stone-400">Loading insights...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-stone-800/50 bg-stone-900/80 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-2">
          <Brain className="size-5 text-amber-400" />
          <h2 className="font-bold text-stone-200">The Brain</h2>
          {timeAgo && (
            <span className="text-[10px] text-stone-600">
              {timeAgo}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/portal/the-move/insights"
            className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition"
          >
            <MessageSquare className="size-3" />
            Chat
          </Link>
          <button
            onClick={triggerAnalysis}
            disabled={analyzing}
            className="flex items-center gap-1 rounded-lg border border-stone-700 bg-stone-800 px-2.5 py-1.5 text-xs text-stone-300 hover:border-stone-600 hover:text-stone-200 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3 ${analyzing ? "animate-spin" : ""}`}
            />
            {analyzing ? "Analyzing..." : "Re-analyze"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mb-3 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {!analysis ? (
        // No analysis yet
        <div className="px-4 pb-5">
          <button
            onClick={triggerAnalysis}
            disabled={analyzing}
            className="w-full rounded-xl border border-dashed border-stone-700 p-6 text-center hover:border-amber-500/50 transition"
          >
            <Brain className="mx-auto mb-2 size-8 text-stone-600" />
            <p className="text-sm text-stone-400">No analysis yet</p>
            <p className="mt-1 text-xs text-amber-500">
              {analyzing ? "Running analysis..." : "Tap to run your first AI analysis"}
            </p>
          </button>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="px-4 pb-3">
            <p className="text-sm text-stone-300 leading-relaxed">
              {analysis.summary}
            </p>
          </div>

          {/* Action Items */}
          {analysis.action_items && analysis.action_items.length > 0 && (
            <div className="mx-4 mb-3 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Zap className="size-3.5 text-amber-400" />
                <span className="text-[10px] font-semibold tracking-wider text-amber-400 uppercase">
                  Action Items
                </span>
              </div>
              <ul className="space-y-1.5">
                {analysis.action_items.slice(0, 3).map((item, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-stone-300"
                  >
                    <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-[9px] font-bold text-amber-400">
                      {i + 1}
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Territory Rankings (top 3) */}
          {analysis.territory_rankings &&
            analysis.territory_rankings.length > 0 && (
              <div className="mx-4 mb-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Trophy className="size-3.5 text-amber-400" />
                  <span className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">
                    Territory Rankings
                  </span>
                </div>
                <div className="space-y-2">
                  {analysis.territory_rankings.slice(0, 3).map((t, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border p-2.5 ${gradeBg(t.grade)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg font-black ${gradeColor(t.grade)}`}
                          >
                            {t.grade}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-stone-200">
                              {t.neighborhood}
                            </p>
                            <p className="text-[10px] text-stone-500">
                              Score: {t.score}/100
                            </p>
                          </div>
                        </div>
                        {t.kpis && (
                          <div className="text-right text-[10px] text-stone-500">
                            {t.kpis.close_rate !== undefined && (
                              <p>
                                Close:{" "}
                                {(t.kpis.close_rate * 100).toFixed(0)}%
                              </p>
                            )}
                            {t.kpis.rpd !== undefined && (
                              <p>$/door: ${t.kpis.rpd.toFixed(0)}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-stone-400">
                        {t.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Expandable detail sections */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-center gap-1 border-t border-stone-800/50 py-2.5 text-xs text-stone-500 hover:text-stone-400 transition"
          >
            {expanded ? (
              <>
                Less <ChevronUp className="size-3" />
              </>
            ) : (
              <>
                More insights <ChevronDown className="size-3" />
              </>
            )}
          </button>

          {expanded && (
            <div className="space-y-3 px-4 pb-4">
              {/* Cold Call Insights */}
              {analysis.cold_call_insights && (
                <div className="rounded-xl bg-stone-800/50 p-3">
                  <h3 className="mb-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Cold Call Insights
                  </h3>
                  {analysis.cold_call_insights.best_times &&
                    analysis.cold_call_insights.best_times.length > 0 && (
                      <p className="text-xs text-stone-300 mb-1">
                        <span className="text-stone-500">Best times:</span>{" "}
                        {analysis.cold_call_insights.best_times.join(", ")}
                      </p>
                    )}
                  {analysis.cold_call_insights.best_days &&
                    analysis.cold_call_insights.best_days.length > 0 && (
                      <p className="text-xs text-stone-300 mb-1">
                        <span className="text-stone-500">Best days:</span>{" "}
                        {analysis.cold_call_insights.best_days.join(", ")}
                      </p>
                    )}
                  {analysis.cold_call_insights.conversion_patterns && (
                    <p className="text-xs text-stone-300">
                      {analysis.cold_call_insights.conversion_patterns}
                    </p>
                  )}
                </div>
              )}

              {/* Door Knock Insights */}
              {analysis.door_knock_insights && (
                <div className="rounded-xl bg-stone-800/50 p-3">
                  <h3 className="mb-2 text-xs font-semibold text-stone-400 uppercase tracking-wider">
                    Door Knock Insights
                  </h3>
                  {analysis.door_knock_insights.best_times &&
                    analysis.door_knock_insights.best_times.length > 0 && (
                      <p className="text-xs text-stone-300 mb-1">
                        <span className="text-stone-500">Best times:</span>{" "}
                        {analysis.door_knock_insights.best_times.join(", ")}
                      </p>
                    )}
                  {analysis.door_knock_insights.weather_impact && (
                    <p className="text-xs text-stone-300 mb-1">
                      <span className="text-stone-500">Weather:</span>{" "}
                      {analysis.door_knock_insights.weather_impact}
                    </p>
                  )}
                  {analysis.door_knock_insights.recommendations &&
                    analysis.door_knock_insights.recommendations.length > 0 && (
                      <ul className="space-y-1 mt-1">
                        {analysis.door_knock_insights.recommendations.map(
                          (r, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-1.5 text-xs text-stone-300"
                            >
                              <ArrowRight className="mt-0.5 size-3 shrink-0 text-amber-500" />
                              {r}
                            </li>
                          )
                        )}
                      </ul>
                    )}
                </div>
              )}

              {/* Trends */}
              {analysis.trends && (
                <div className="rounded-xl bg-stone-800/50 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="size-3.5 text-amber-400" />
                    <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">
                      Trends
                    </h3>
                  </div>
                  <p className="text-xs text-stone-300">{analysis.trends}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}
