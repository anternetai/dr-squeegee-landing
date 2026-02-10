"use client"

import { use, useState } from "react"
import { Bell, Users, CalendarCheck } from "lucide-react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { PortalAuthContext } from "./portal-auth-provider"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getRelativeTime } from "@/lib/portal/format"

interface Notification {
  id: string
  type: "lead" | "appointment"
  title: string
  description: string
  time: string
  read: boolean
}

async function fetchNotifications([, clientId]: [string, string]): Promise<Notification[]> {
  const supabase = createClient()
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const notifications: Notification[] = []

  // Get new leads from last 24h
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, created_at")
    .eq("client_id", clientId)
    .gte("created_at", yesterday)
    .order("created_at", { ascending: false })
    .limit(10)

  for (const lead of leads ?? []) {
    notifications.push({
      id: `lead-${lead.id}`,
      type: "lead",
      title: "New lead",
      description: lead.name || "Unknown lead",
      time: lead.created_at,
      read: false,
    })
  }

  // Get upcoming appointments (next 48h)
  const twoDaysOut = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString()
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, scheduled_at, lead:leads(name)")
    .eq("client_id", clientId)
    .gte("scheduled_at", new Date().toISOString())
    .lte("scheduled_at", twoDaysOut)
    .in("status", ["scheduled", "confirmed"])
    .order("scheduled_at", { ascending: true })
    .limit(10)

  for (const appt of appointments ?? []) {
    const leadArr = appt.lead as unknown as { name: string }[] | null
    const leadName = leadArr?.[0]?.name ?? "Unknown lead"
    notifications.push({
      id: `appt-${appt.id}`,
      type: "appointment",
      title: "Upcoming appointment",
      description: leadName,
      time: appt.scheduled_at,
      read: true,
    })
  }

  // Sort by time, newest first
  notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return notifications
}

export function NotificationDropdown() {
  const { user } = use(PortalAuthContext)
  const [tab, setTab] = useState("unread")

  const { data: notifications } = useSWR(
    user ? ["notifications", user.id] : null,
    fetchNotifications,
    { refreshInterval: 60000 }
  )

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0
  const unread = notifications?.filter((n) => !n.read) ?? []
  const all = notifications ?? []
  const display = tab === "unread" ? unread : all

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-red-500" />
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
        </div>
        <Tabs value={tab} onValueChange={setTab}>
          <div className="border-b px-4">
            <TabsList className="h-9 w-full justify-start rounded-none border-none bg-transparent p-0">
              <TabsTrigger
                value="unread"
                className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1.5 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                Unread{unreadCount > 0 ? ` (${unreadCount})` : ""}
              </TabsTrigger>
              <TabsTrigger
                value="all"
                className="rounded-none border-b-2 border-transparent px-3 pb-2 pt-1.5 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                All
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value={tab} className="m-0">
            {display.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-muted-foreground">
                <Bell className="size-6" />
                <p className="text-sm">
                  {tab === "unread"
                    ? "You're all caught up!"
                    : "No notifications yet."}
                </p>
                <p className="text-xs">
                  Notifications will appear here when you get new leads or appointments.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-auto">
                {display.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 border-b px-4 py-3 last:border-0"
                  >
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      {n.type === "lead" ? (
                        <Users className="size-3.5 text-primary" />
                      ) : (
                        <CalendarCheck className="size-3.5 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {n.description}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {getRelativeTime(n.time)}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}
