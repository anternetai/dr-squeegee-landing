"use client"

import { use } from "react"
import { PortalAuthContext } from "@/components/portal/portal-auth-provider"
import { ConversationList } from "@/components/portal/conversation-list"

export default function ConversationsPage() {
  const { user } = use(PortalAuthContext)
  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          SMS conversations with your leads
        </p>
      </div>
      <ConversationList clientId={user.id} />
    </div>
  )
}
