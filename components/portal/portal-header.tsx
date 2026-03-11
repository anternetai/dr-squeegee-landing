"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "./theme-toggle"
import { NotificationDropdown } from "./notification-dropdown"
import { PortalBreadcrumbs } from "./portal-breadcrumbs"

export function PortalHeader() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-card/80 px-4 backdrop-blur-md dark:shadow-[0_1px_0_0_rgba(255,255,255,0.04)]">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <PortalBreadcrumbs />
      <div className="flex-1" />
      <NotificationDropdown />
      <ThemeToggle />
    </header>
  )
}
