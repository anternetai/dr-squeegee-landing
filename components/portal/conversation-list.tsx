"use client"

import { useState, useEffect, useRef } from "react"
import { MessageSquare, ArrowLeft } from "lucide-react"
import useSWR from "swr"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatPhone, getRelativeTime } from "@/lib/portal/format"
import { useIsMobile } from "@/hooks/use-mobile"
import type { ConversationThread, SmsConversationRow } from "@/lib/portal/types"

interface ConversationListProps {
  clientId: string
}

async function fetchThreads([, clientId]: [string, string]): Promise<ConversationThread[]> {
  const supabase = createClient()

  // Get all leads for this client
  const { data: leads } = await supabase
    .from("leads")
    .select("id, name, phone")
    .eq("client_id", clientId)

  if (!leads?.length) return []

  // Get message counts and last message per lead
  const threads: ConversationThread[] = []

  for (const lead of leads) {
    const { data: messages, count } = await supabase
      .from("sms_conversations")
      .select("content, created_at", { count: "exact" })
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false })
      .limit(1)

    if (count && count > 0) {
      threads.push({
        lead_id: lead.id,
        lead_name: lead.name || "Unknown",
        lead_phone: lead.phone,
        last_message: messages?.[0]?.content ?? null,
        last_message_at: messages?.[0]?.created_at ?? null,
        message_count: count,
      })
    }
  }

  // Sort by most recent message
  threads.sort((a, b) => {
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  })

  return threads
}

async function fetchMessages([, leadId]: [string, string]): Promise<SmsConversationRow[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from("sms_conversations")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: true })

  return (data ?? []) as SmsConversationRow[]
}

export function ConversationList({ clientId }: ConversationListProps) {
  const isMobile = useIsMobile()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data: threads, isLoading } = useSWR(
    ["threads", clientId],
    fetchThreads,
    { revalidateOnFocus: false }
  )

  const selected = threads?.find((t) => t.lead_id === selectedLeadId)

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    )
  }

  if (!threads?.length) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <MessageSquare className="size-8" />
        <p className="font-medium">No conversations yet</p>
        <p className="max-w-sm text-sm">
          Once your first lead comes in, you&apos;ll see the full text thread
          right here &mdash; every message between your leads and our AI assistant.
        </p>
      </div>
    )
  }

  // Mobile: show list or thread
  if (isMobile) {
    if (selectedLeadId && selected) {
      return (
        <div className="flex h-[calc(100svh-10rem)] flex-col">
          <div className="flex items-center gap-2 border-b pb-3">
            <Button variant="ghost" size="icon" onClick={() => setSelectedLeadId(null)} aria-label="Back">
              <ArrowLeft className="size-4" />
            </Button>
            <div className="min-w-0">
              <p className="truncate font-medium">{selected.lead_name}</p>
              <p className="text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatPhone(selected.lead_phone)}
              </p>
            </div>
          </div>
          <MessageThread leadId={selectedLeadId} />
        </div>
      )
    }

    return (
      <div className="space-y-1">
        {threads.map((thread) => (
          <ThreadRow
            key={thread.lead_id}
            thread={thread}
            isSelected={false}
            onClick={() => setSelectedLeadId(thread.lead_id)}
          />
        ))}
      </div>
    )
  }

  // Desktop: side-by-side
  return (
    <div className="flex h-[calc(100svh-14rem)] gap-4 overflow-hidden rounded-lg border">
      <div className="w-80 shrink-0 overflow-auto border-r">
        {threads.map((thread) => (
          <ThreadRow
            key={thread.lead_id}
            thread={thread}
            isSelected={thread.lead_id === selectedLeadId}
            onClick={() => setSelectedLeadId(thread.lead_id)}
          />
        ))}
      </div>
      <div className="flex flex-1 flex-col">
        {selectedLeadId ? (
          <>
            <div className="border-b px-4 py-3">
              <p className="font-medium">{selected?.lead_name}</p>
              <p className="text-xs text-muted-foreground" style={{ fontVariantNumeric: "tabular-nums" }}>
                {selected ? formatPhone(selected.lead_phone) : ""}
              </p>
            </div>
            <MessageThread leadId={selectedLeadId} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}

function ThreadRow({
  thread,
  isSelected,
  onClick,
}: {
  thread: ConversationThread
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-accent",
        isSelected && "bg-accent"
      )}
      style={{ touchAction: "manipulation" }}
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{thread.lead_name}</p>
          {thread.last_message_at && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {getRelativeTime(thread.last_message_at)}
            </span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {thread.last_message || "No messages"}
        </p>
      </div>
    </button>
  )
}

function MessageThread({ leadId }: { leadId: string }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { data: messages, isLoading } = useSWR(
    ["messages", leadId],
    fetchMessages,
    { refreshInterval: 5000 }
  )

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (isLoading) {
    return (
      <div className="flex-1 space-y-3 p-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-3/4" />
        ))}
      </div>
    )
  }

  if (!messages?.length) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        No messages in this conversation
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto p-4">
      <div className="space-y-3">
        {messages.map((msg) => {
          const isOutbound = msg.role === "assistant"
          return (
            <div
              key={msg.id}
              className={cn(
                "flex",
                isOutbound ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                  isOutbound
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted rounded-bl-sm"
                )}
              >
                <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    isOutbound
                      ? "text-primary-foreground/70"
                      : "text-muted-foreground"
                  )}
                >
                  {isOutbound ? "SAM" : "Lead"} &middot; {getRelativeTime(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
