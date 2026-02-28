import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { SqueegeeNav } from "@/components/squeegee/squeegee-nav"

export const metadata: Metadata = {
  title: "Dr. Squeegee | CRM",
  description: "Internal job management portal for Dr. Squeegee — House Calls for a Cleaner Home.",
  icons: { icon: "/favicon-squeegee.svg" },
  openGraph: {
    title: "Dr. Squeegee",
    description: "House Calls for a Cleaner Home",
    siteName: "Dr. Squeegee",
    type: "website",
  },
}

export default function SqueegeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <div className="min-h-screen bg-background">
        <SqueegeeNav />
        <main className="container mx-auto px-4 py-6 max-w-5xl">
          {children}
        </main>
      </div>
    </ThemeProvider>
  )
}
