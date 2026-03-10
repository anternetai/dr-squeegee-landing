import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-brand-display",
  subsets: ["latin"],
  weight: ["700", "800", "900"],
});

const outfit = Outfit({
  variable: "--font-brand-body",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://homefieldhub.com"),
  title: "HomeField Hub | AI-Powered Lead Generation for Home Service Contractors",
  description: "Exclusive Facebook ads, AI-powered follow-up, and performance-based pricing. $200 per booked appointment — no retainer, no risk.",
  keywords: ["roofing leads", "contractor lead generation", "home service marketing", "roofing marketing", "AI lead generation", "Facebook ads contractors"],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "HomeField Hub | AI-Powered Lead Generation",
    description: "Exclusive Facebook ads, AI-powered follow-up, and performance-based pricing for home service contractors.",
    type: "website",
    url: "https://homefieldhub.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${outfit.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
