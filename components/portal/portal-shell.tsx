"use client"

import type { ReactNode } from "react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SidebarNav } from "./sidebar-nav"
import { PortalHeader } from "./portal-header"
import { PortalAuthProvider } from "./portal-auth-provider"
import type { Client, TeamMember } from "@/lib/portal/types"

interface PortalShellProps {
  children: ReactNode
  user: Client
  initialTeamMember?: TeamMember | null
}

export function PortalShell({ children, user, initialTeamMember }: PortalShellProps) {
  const displayName = initialTeamMember
    ? `${initialTeamMember.first_name ?? ""} ${initialTeamMember.last_name ?? ""}`.trim() || initialTeamMember.email
    : `${user.first_name} ${user.last_name}`.trim() || user.legal_business_name
  const displayEmail = initialTeamMember?.email || user.email_for_notifications || user.business_email_for_leads

  return (
    <PortalAuthProvider initialUser={user} initialTeamMember={initialTeamMember ?? null}>
      <SidebarProvider>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <SidebarNav
          user={{
            name: displayName,
            email: displayEmail,
            role: initialTeamMember?.role || user.role,
          }}
        />
        <SidebarInset>
          <PortalHeader />
          <main id="main-content" className="flex-1 overflow-auto p-4 md:p-6 dark:bg-gradient-to-b dark:from-background dark:to-background/95">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </PortalAuthProvider>
  )
}
