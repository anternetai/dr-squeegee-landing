import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Dr. Squeegee | House Calls for a Cleaner Home",
  description:
    "Charlotte's trusted pressure washing specialist. House washing, driveways, patios — done right, every time. Get your free quote today.",
  icons: {
    icon: [
      { url: "/favicon-squeegee.svg", type: "image/svg+xml" },
      { url: "/favicon-squeegee-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon-squeegee.png",
  },
  openGraph: {
    title: "Dr. Squeegee — House Calls for a Cleaner Home",
    description:
      "Charlotte's trusted pressure washing specialist. Free estimates, licensed & insured.",
    siteName: "Dr. Squeegee",
    type: "website",
  },
}

export default function GetQuoteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#FEFCF7] text-[#2B2B2B] antialiased" style={{ fontFamily: "var(--font-brand-body), sans-serif" }}>
      {children}
    </div>
  )
}
