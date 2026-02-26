"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Droplets, LayoutDashboard, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    label: "Dashboard",
    href: "/squeegee-portal",
    icon: LayoutDashboard,
  },
  {
    label: "Jobs",
    href: "/squeegee-portal/jobs",
    icon: Briefcase,
  },
]

export function SqueegeeNav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex h-14 items-center gap-6">
          {/* Brand */}
          <Link
            href="/squeegee-portal"
            className="flex items-center gap-2 font-bold text-[oklch(0.55_0.18_210)] shrink-0"
          >
            <Droplets className="h-5 w-5" />
            <span className="hidden sm:inline">Dr. Squeegee</span>
          </Link>

          {/* Nav */}
          <nav className="flex items-center gap-1 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === "/squeegee-portal"
                  ? pathname === "/squeegee-portal"
                  : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[oklch(0.93_0.07_210)] text-[oklch(0.3_0.15_210)] dark:bg-[oklch(0.25_0.07_210)] dark:text-[oklch(0.85_0.1_210)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side info */}
          <div className="shrink-0 text-xs text-muted-foreground hidden sm:block">
            Internal portal
          </div>
        </div>
      </div>
    </header>
  )
}
