"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import { CalendarClock, Phone, PhoneCall, ChevronRight, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DemoLead {
  demo_date: string
  first_name: string | null
  last_name: string | null
  business_name: string | null
  phone: string | null
}

interface CallbackCounts {
  overdue: number
  today: number
  total: number
}

// ─── Fetchers ──────────────────────────────────────────────────────────────────

async function fetchUpcomingDemos(): Promise<DemoLead[]> {
  const supabase = createClient()
  const now = new Date()
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from("dialer_leads")
    .select("demo_date, first_name, last_name, business_name, phone")
    .eq("demo_booked", true)
    .gte("demo_date", now.toISOString())
    .lte("demo_date", in24h.toISOString())
    .order("demo_date", { ascending: true })
    .limit(3)

  if (error) throw error
  return (data ?? []) as DemoLead[]
}

async function fetchCallbackCounts(): Promise<CallbackCounts> {
  const supabase = createClient()
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  const [overdueRes, todayRes, totalRes] = await Promise.all([
    supabase
      .from("dialer_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "callback")
      .not("next_call_at", "is", null)
      .lt("next_call_at", now.toISOString()),
    supabase
      .from("dialer_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "callback")
      .not("next_call_at", "is", null)
      .gte("next_call_at", now.toISOString())
      .lte("next_call_at", todayEnd.toISOString()),
    supabase
      .from("dialer_leads")
      .select("*", { count: "exact", head: true })
      .eq("status", "callback"),
  ])

  return {
    overdue: overdueRes.count ?? 0,
    today: todayRes.count ?? 0,
    total: totalRes.count ?? 0,
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string | null): string {
  if (!phone) return "—"
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  return phone
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours > 0) {
    return minutes > 0
      ? `${hours}h ${minutes}m`
      : `${hours}h`
  }
  return `${minutes}m`
}

// ─── Demo Card ─────────────────────────────────────────────────────────────────

interface DemoCardProps {
  demo: DemoLead
}

function DemoCard({ demo }: DemoCardProps) {
  const [msUntil, setMsUntil] = useState<number>(() => {
    return new Date(demo.demo_date).getTime() - Date.now()
  })

  useEffect(() => {
    const update = () => {
      setMsUntil(new Date(demo.demo_date).getTime() - Date.now())
    }
    update()
    const id = setInterval(update, 30_000)
    return () => clearInterval(id)
  }, [demo.demo_date])

  const isWithinHour = msUntil > 0 && msUntil <= 60 * 60 * 1000
  const contactName = [demo.first_name, demo.last_name].filter(Boolean).join(" ") || "Unknown"
  const businessDisplay = demo.business_name || contactName

  return (
    <div className="flex items-start gap-3 min-w-0">
      {/* Icon */}
      <div className="mt-0.5 flex-shrink-0 rounded-full bg-orange-500/15 p-2 text-orange-500 dark:bg-orange-500/20">
        <CalendarClock className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
            Demo in {msUntil > 0 ? formatCountdown(msUntil) : "now"}
          </span>
          {isWithinHour && (
            <Badge
              variant="outline"
              className="border-orange-400/60 bg-orange-500/10 text-orange-600 dark:border-orange-500/50 dark:text-orange-400 text-[10px] px-1.5 py-0"
            >
              Prep now
            </Badge>
          )}
        </div>

        <p className="truncate text-sm font-medium leading-tight">
          {businessDisplay}
          {demo.business_name && demo.business_name !== contactName && (
            <span className="ml-1 font-normal text-muted-foreground">
              · {contactName}
            </span>
          )}
        </p>

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span>{formatPhone(demo.phone)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Callback Nudge ────────────────────────────────────────────────────────────

function CallbackNudge({ counts }: { counts: CallbackCounts }) {
  const hasOverdue = counts.overdue > 0
  const urgent = counts.overdue + counts.today

  return (
    <Card className={
      hasOverdue
        ? "border-amber-400/40 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/[0.06]"
        : "border-blue-400/30 bg-blue-50/40 dark:border-blue-500/20 dark:bg-blue-500/[0.04]"
    }>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            {/* Icon */}
            <div className={`flex-shrink-0 rounded-full p-2 ${
              hasOverdue
                ? "bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                : "bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
            }`}>
              {hasOverdue
                ? <AlertCircle className="h-4 w-4" />
                : <PhoneCall className="h-4 w-4" />
              }
            </div>

            {/* Text */}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-sm font-semibold ${
                  hasOverdue
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-blue-700 dark:text-blue-400"
                }`}>
                  {hasOverdue
                    ? `${counts.overdue} overdue callback${counts.overdue !== 1 ? "s" : ""}`
                    : `${counts.total} callback${counts.total !== 1 ? "s" : ""} waiting`
                  }
                </span>

                {urgent > 0 && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${
                      hasOverdue
                        ? "border-amber-400/60 bg-amber-500/10 text-amber-700 dark:border-amber-500/50 dark:text-amber-400"
                        : "border-blue-400/60 bg-blue-500/10 text-blue-700 dark:border-blue-500/50 dark:text-blue-400"
                    }`}
                  >
                    {urgent > 0 ? `${urgent} due today` : "On deck"}
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-0.5">
                {hasOverdue
                  ? "These leads expected your call — time to follow up."
                  : "No demos yet today. Work the pipeline."
                }
              </p>
            </div>
          </div>

          {/* CTA */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className={`shrink-0 gap-1.5 ${
              hasOverdue
                ? "border-amber-400/50 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/40 dark:hover:bg-amber-500/10"
                : "border-blue-400/50 text-blue-700 hover:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/40 dark:hover:bg-blue-500/10"
            }`}
          >
            <Link href="/portal/cold-calls?tab=pipeline">
              Work callbacks
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────────

export function UpcomingDemoBanner() {
  const { data: demos, error: demosError } = useSWR<DemoLead[]>(
    "upcoming-demos",
    fetchUpcomingDemos,
    { refreshInterval: 60_000, revalidateOnFocus: true }
  )

  const { data: callbacks } = useSWR<CallbackCounts>(
    "callback-counts-banner",
    fetchCallbackCounts,
    { refreshInterval: 120_000, revalidateOnFocus: true }
  )

  // Loading — render nothing (avoid layout shift)
  if (demos === undefined) return null

  // Has upcoming demos — show demo banner (original behavior)
  if (!demosError && demos.length > 0) {
    return (
      <Card className="border-orange-400/40 bg-orange-50/60 dark:border-orange-500/30 dark:bg-orange-500/[0.06]">
        <CardContent className="py-3 px-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
            {demos.map((demo) => (
              <DemoCard key={demo.demo_date + (demo.phone ?? "")} demo={demo} />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // No demos — show callback nudge if there are callbacks waiting
  if (callbacks && callbacks.total > 0) {
    return <CallbackNudge counts={callbacks} />
  }

  // Nothing to show
  return null
}
