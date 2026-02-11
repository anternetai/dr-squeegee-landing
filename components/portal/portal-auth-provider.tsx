"use client"

import { createContext, useCallback, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Client, TeamMember } from "@/lib/portal/types"

interface PortalAuthContext {
  user: Client | null
  loading: boolean
  teamMember: TeamMember | null
  refreshUser: () => Promise<void>
}

export const PortalAuthContext = createContext<PortalAuthContext>({
  user: null,
  loading: true,
  teamMember: null,
  refreshUser: async () => {},
})

async function fetchClientForAuth(supabase: ReturnType<typeof createClient>, authUserId: string) {
  // Try direct match first (primary client)
  const { data: directClient } = await supabase
    .from("agency_clients")
    .select("*")
    .eq("auth_user_id", authUserId)
    .single()

  if (directClient) {
    return { client: directClient as Client, teamMember: null }
  }

  // Fallback: check team_members table
  const { data: tm } = await supabase
    .from("client_team_members")
    .select("*")
    .eq("auth_user_id", authUserId)
    .limit(1)
    .single()

  if (tm) {
    const { data: parentClient } = await supabase
      .from("agency_clients")
      .select("*")
      .eq("id", tm.client_id)
      .single()

    if (parentClient) {
      return { client: parentClient as Client, teamMember: tm as TeamMember }
    }
  }

  return { client: null, teamMember: null }
}

export function PortalAuthProvider({ children, initialUser }: { children: ReactNode; initialUser: Client | null }) {
  const [user, setUser] = useState<Client | null>(initialUser)
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null)
  const [loading, setLoading] = useState(!initialUser)
  const router = useRouter()
  const supabase = createClient()

  const refreshUser = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser) {
      const result = await fetchClientForAuth(supabase, authUser.id)
      if (result.client) setUser(result.client)
      if (result.teamMember) setTeamMember(result.teamMember)
    }
  }, [supabase])

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_OUT") {
          setUser(null)
          setTeamMember(null)
          router.push("/portal/login")
        }
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          const { data: { user: authUser } } = await supabase.auth.getUser()
          if (authUser) {
            const result = await fetchClientForAuth(supabase, authUser.id)
            if (result.client) setUser(result.client)
            if (result.teamMember) setTeamMember(result.teamMember)
          }
          setLoading(false)
        }
      }
    )
    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <PortalAuthContext value={{ user, loading, teamMember, refreshUser }}>
      {children}
    </PortalAuthContext>
  )
}
