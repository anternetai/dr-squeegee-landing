import { ThemeProvider } from "next-themes"
import { createClient } from "@/lib/supabase/server"
import { PortalShell } from "@/components/portal/portal-shell"
import type { Client } from "@/lib/portal/types"

export const metadata = {
  title: "Portal | HomeField Hub",
}

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  let client: Client | null = null
  if (authUser) {
    // Try direct match (primary client)
    const { data } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("auth_user_id", authUser.id)
      .single()
    client = data as Client | null

    // Fallback: check if user is a team member
    if (!client) {
      const { data: tm } = await supabase
        .from("client_team_members")
        .select("client_id")
        .eq("auth_user_id", authUser.id)
        .limit(1)
        .single()

      if (tm) {
        const { data: parentClient } = await supabase
          .from("agency_clients")
          .select("*")
          .eq("id", tm.client_id)
          .single()
        client = parentClient as Client | null
      }
    }
  }

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {client ? (
        <PortalShell user={client}>{children}</PortalShell>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
