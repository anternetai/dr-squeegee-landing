"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  CalendarCheck,
  CreditCard,
  Shield,
  UserPlus,
  PhoneCall,
  Headphones,
  Cpu,
  MapPin,
  DoorOpen,
  Brain,
  Settings,
  ClipboardList,
  ChevronRight,
  Compass,
  Crosshair,
  Rocket,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { UserMenu } from "./user-menu"
import { TEAM_ROLE_CONFIG } from "@/lib/portal/constants"
import type { TeamMemberRole } from "@/lib/portal/types"

type NavItem = {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

type NavGroup = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  items: NavItem[]
}

// Client/team member nav — always visible
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  { label: "Leads", href: "/portal/leads", icon: Users },
  { label: "Conversations", href: "/portal/conversations", icon: MessageSquare },
  { label: "Appointments", href: "/portal/appointments", icon: CalendarCheck },
  { label: "Billing", href: "/portal/billing", icon: CreditCard },
]

// Admin collapsible groups
const adminGroups: NavGroup[] = [
  {
    label: "Operations",
    icon: Compass,
    items: [
      { label: "Clients", href: "/portal/admin", icon: Shield },
      { label: "Manage", href: "/portal/admin/manage", icon: ClipboardList },
      { label: "Prospects", href: "/portal/admin/prospects", icon: UserPlus },
      { label: "Control Panel", href: "/portal/admin/control", icon: Cpu },
    ],
  },
  {
    label: "Sales",
    icon: Crosshair,
    items: [
      { label: "Cold Calls", href: "/portal/cold-calls", icon: PhoneCall },
      { label: "Call Logs", href: "/portal/calls", icon: Headphones },
    ],
  },
  {
    label: "The Move",
    icon: Rocket,
    items: [
      { label: "Overview", href: "/portal/the-move", icon: MapPin },
      { label: "Door Knocks", href: "/portal/the-move/knocks", icon: DoorOpen },
      { label: "AI Insights", href: "/portal/the-move/insights", icon: Brain },
    ],
  },
]

function isGroupActive(items: NavItem[], pathname: string) {
  return items.some((item) =>
    item.href === "/portal/admin"
      ? pathname === item.href
      : pathname.startsWith(item.href)
  )
}

function isItemActive(href: string, pathname: string) {
  if (href === "/portal/dashboard" || href === "/portal/admin") {
    return pathname === href
  }
  return pathname.startsWith(href)
}

interface SidebarNavProps {
  user: {
    name: string
    email: string
    role: string
  }
}

function CollapsibleNavGroup({
  group,
  pathname,
  onNavClick,
  defaultOpen,
}: {
  group: NavGroup
  pathname: string
  onNavClick: () => void
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const groupActive = isGroupActive(group.items, pathname)
  const GroupIcon = group.icon

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={group.label}
            className="group/trigger"
            data-active={groupActive || undefined}
          >
            <GroupIcon
              className={`size-4 transition-colors ${
                groupActive
                  ? "text-orange-500"
                  : "text-muted-foreground group-hover/trigger:text-foreground"
              }`}
            />
            <span
              className={`flex-1 font-medium transition-colors ${
                groupActive ? "text-foreground" : ""
              }`}
            >
              {group.label}
            </span>
            <ChevronRight
              className={`size-3.5 text-muted-foreground/60 transition-transform duration-200 ${
                open ? "rotate-90" : ""
              }`}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
          <SidebarMenuSub>
            {group.items.map((item) => {
              const active = isItemActive(item.href, pathname)
              return (
                <SidebarMenuSubItem key={item.href}>
                  <SidebarMenuSubButton asChild isActive={active} className={active ? "dark:shadow-[0_0_6px_rgba(249,115,22,0.12)]" : ""}>
                    <Link href={item.href} onClick={onNavClick}>
                      <item.icon
                        className={`size-3.5 ${
                          active ? "text-orange-500" : ""
                        }`}
                      />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function SidebarNav({ user }: SidebarNavProps) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  function handleNavClick() {
    setOpenMobile(false)
  }

  const filteredNavItems = (() => {
    if (user.role === "client" || user.role === "admin") return navItems
    const config = TEAM_ROLE_CONFIG[user.role as TeamMemberRole]
    if (!config) return navItems
    return navItems.filter((item) => config.allowedRoutes.includes(item.href))
  })()

  const isAdmin = user.role === "admin"

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link
          href="/portal/dashboard"
          onClick={handleNavClick}
          className="flex items-center gap-2.5"
        >
          <Image src="/favicon.svg" alt="HomeField Hub" width={28} height={28} />
          <span className="text-base font-semibold tracking-tight">
            HomeField Hub
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Navigation — flat list, always visible */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const active = isItemActive(item.href, pathname)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={active}
                      tooltip={item.label}
                      className={active ? "relative bg-sidebar-accent/60 before:absolute before:left-0 before:top-1/2 before:h-5 before:-translate-y-1/2 before:w-[3px] before:rounded-full before:bg-orange-500 dark:shadow-[0_0_8px_rgba(249,115,22,0.15)]" : ""}
                    >
                      <Link href={item.href} onClick={handleNavClick}>
                        <item.icon
                          className={`size-4 ${active ? "text-orange-500" : ""}`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin collapsible groups */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminGroups.map((group) => (
                  <CollapsibleNavGroup
                    key={group.label}
                    group={group}
                    pathname={pathname}
                    onNavClick={handleNavClick}
                    defaultOpen={isGroupActive(group.items, pathname)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Settings */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith("/portal/settings")}
                  tooltip="Settings"
                >
                  <Link href="/portal/settings" onClick={handleNavClick}>
                    <Settings
                      className={`size-4 ${
                        pathname.startsWith("/portal/settings")
                          ? "text-orange-500"
                          : ""
                      }`}
                    />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu name={user.name} email={user.email} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
