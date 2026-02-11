"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

const ROUTE_LABELS: Record<string, string> = {
  "": "Dashboard",
  leads: "Leads",
  conversations: "Conversations",
  appointments: "Appointments",
  billing: "Billing",
  settings: "Settings",
  admin: "Clients",
  prospects: "Prospects",
}

export function PortalBreadcrumbs() {
  const pathname = usePathname()

  // Strip /portal prefix and split
  const stripped = pathname.replace(/^\/portal\/?/, "")
  const segments = stripped ? stripped.split("/") : []

  // Build breadcrumb items
  const items: Array<{ label: string; href?: string }> = []

  if (segments.length === 0) {
    items.push({ label: "Dashboard" })
  } else if (segments[0] === "admin") {
    // Admin routes
    items.push({ label: "Clients", href: segments.length > 1 ? "/portal/admin" : undefined })
    if (segments[1] === "clients" && segments[2]) {
      items.push({ label: "Client Details" })
    } else if (segments[1] === "prospects") {
      items.push({ label: "Prospects" })
    }
  } else {
    items.push({ label: "Dashboard", href: "/portal" })
    const label = ROUTE_LABELS[segments[0]] || segments[0]
    items.push({ label })
  }

  if (items.length <= 1 && !items[0]?.href) {
    // Single item, no need for breadcrumbs — just show the page title
    return (
      <div className="flex items-center text-sm">
        <span className="font-medium">{items[0]?.label}</span>
      </div>
    )
  }

  return (
    <nav className="flex items-center gap-1 text-sm" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="size-3.5 text-muted-foreground" />}
          {item.href ? (
            <Link href={item.href} className="text-muted-foreground hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
