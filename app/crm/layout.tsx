import type { Metadata } from "next"
import { SqueegeeNav } from "@/components/squeegee/squeegee-nav"

export const metadata: Metadata = {
  title: "Dr. Squeegee | CRM",
  description: "Internal job management portal for Dr. Squeegee House Washing",
}

export default function SqueegeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <SqueegeeNav />
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {children}
      </main>
    </div>
  )
}
