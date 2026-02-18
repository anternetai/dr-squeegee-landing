"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Phone,
  Kanban,
  Activity,
  Zap,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { label: "Dashboard", href: "/mission", icon: LayoutDashboard },
  { label: "Projects", href: "/mission/projects", icon: FolderKanban },
  { label: "Tasks", href: "/mission/tasks", icon: CheckSquare },
  { label: "Lead Tracker", href: "/mission/leads", icon: Users },
  { label: "Call Tracker", href: "/mission/calls", icon: Phone },
  { label: "Pipeline", href: "/mission/pipeline", icon: Kanban },
  { label: "Systems", href: "/mission/systems", icon: Activity },
]

export function MissionSidebarNav() {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  function handleNavClick() {
    setOpenMobile(false)
  }

  function isActive(href: string) {
    if (href === "/mission") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" onClick={handleNavClick} className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-semibold leading-tight">Mission Control</span>
            <span className="text-[10px] text-muted-foreground leading-tight">HomeField Hub</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    tooltip={item.label}
                  >
                    <Link href={item.href} onClick={handleNavClick}>
                      <item.icon className={isActive(item.href) ? "size-4 text-orange-500" : "size-4"} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">Anthony</span>
            <span className="text-xs text-muted-foreground leading-tight">Admin</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
