import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HomeField Hub | AI-Powered Lead Generation for Contractors",
  description: "Fill your calendar with qualified appointments. AI-powered lead generation and booking for home service contractors. Pay-per-appointment, no risk.",
  keywords: ["contractor leads", "roofing leads", "home service marketing", "AI lead generation", "contractor appointments"],
  openGraph: {
    title: "HomeField Hub | Qualified Leads for Contractors",
    description: "AI-powered lead generation. Fill your calendar with qualified appointments. Pay-per-appointment.",
    type: "website",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
