import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { MissionSidebarNav } from "@/components/mission/sidebar-nav";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export const metadata: Metadata = {
  title: "Mission Control — HomeField Hub",
  description: "Internal operations dashboard for HomeField Hub",
};

export default function MissionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <SidebarProvider>
        <MissionSidebarNav />
        <SidebarInset>
          <header className="flex h-14 items-center gap-2 border-b border-border px-4 lg:hidden">
            <SidebarTrigger />
            <span className="text-sm font-semibold">Mission Control</span>
          </header>
          <main className="flex-1 overflow-y-auto p-6 lg:p-8">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}
