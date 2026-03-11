"use client"

import { useRouter } from "next/navigation"
import { CalendarClock, ChevronRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/portal/format"
import type { AdminClientMetrics } from "@/lib/portal/types"

interface UpcomingScheduleProps {
  clients: AdminClientMetrics[] | undefined
}

export function UpcomingSchedule({ clients }: UpcomingScheduleProps) {
  const router = useRouter()

  // Filter clients with upcoming calls and sort by nearest first
  const upcoming = (clients ?? [])
    .filter((c) => {
      if (!c.next_call_at) return false
      return new Date(c.next_call_at) >= new Date()
    })
    .sort(
      (a, b) =>
        new Date(a.next_call_at!).getTime() -
        new Date(b.next_call_at!).getTime()
    )
    .slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Upcoming Calls</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {upcoming.length === 0 ? (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No calls scheduled
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {upcoming.map((client) => (
              <button
                key={client.id}
                onClick={() =>
                  router.push(`/portal/admin/clients/${client.id}`)
                }
                className="flex w-full items-center gap-3 py-3 text-left transition-all first:pt-0 last:pb-0 hover:bg-accent/50 -mx-2 px-2 rounded-md dark:hover:bg-orange-500/5 dark:hover:shadow-[inset_2px_0_0_rgb(249,115,22)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {client.legal_business_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDateTime(client.next_call_at!)}
                  </p>
                </div>
                {client.next_call_type && (
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {client.next_call_type}
                  </Badge>
                )}
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
