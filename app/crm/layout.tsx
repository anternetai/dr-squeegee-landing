import type { Metadata } from "next"
import { ThemeProvider } from "next-themes"
import { Geist, Geist_Mono } from "next/font/google"
import "../globals.css"
import { SqueegeeNav } from "@/components/squeegee/squeegee-nav"

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] })
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Dr. Squeegee | Job Portal",
  description: "Internal job management portal for Dr. Squeegee House Washing",
}

export default function SqueegeeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="min-h-screen bg-background">
            <SqueegeeNav />
            <main className="container mx-auto px-4 py-6 max-w-5xl">
              {children}
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
