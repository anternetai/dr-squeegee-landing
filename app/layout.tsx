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
  title: "HomeField Hub | AI-Powered Lead Generation for Contractors",
  description: "Fill your calendar with qualified appointments. AI-powered lead generation and booking for home service contractors. Pay-per-appointment, no risk.",
  keywords: ["contractor leads", "roofing leads", "home service marketing", "AI lead generation", "contractor appointments"],
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "HomeField Hub | Qualified Leads for Contractors",
    description: "AI-powered lead generation. Fill your calendar with qualified appointments. Pay-per-appointment.",
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
