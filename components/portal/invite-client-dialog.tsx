"use client"

import { useState } from "react"
import { Mail, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { AdminClientMetrics } from "@/lib/portal/types"

interface InviteClientDialogProps {
  clients: AdminClientMetrics[]
}

export function InviteClientDialog({ clients }: InviteClientDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only show clients without auth accounts
  const uninvited = clients.filter((c) => !c.auth_user_id && c.role !== "admin")

  async function handleInvite() {
    if (!selectedId) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch("/api/portal/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Failed to send invite")
        return
      }

      setSent(data.email)
    } catch {
      setError("Something went wrong")
    } finally {
      setSending(false)
    }
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen)
    if (!isOpen) {
      setSelectedId(null)
      setSent(null)
      setError(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Mail className="mr-1.5 size-3.5" />
          Invite Client
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Client to Portal</DialogTitle>
          <DialogDescription>
            Send an email invite so your client can log in, view leads, and
            track appointments.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="size-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium">Invite sent</p>
              <p className="text-sm text-muted-foreground">
                An email has been sent to {sent}. They&apos;ll be able to set a
                password and log in.
              </p>
            </div>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            {uninvited.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                All clients already have portal accounts.
              </div>
            ) : (
              <div className="max-h-64 space-y-1 overflow-auto">
                {uninvited.map((client) => {
                  const email =
                    client.email_for_notifications ||
                    client.business_email_for_leads
                  return (
                    <button
                      key={client.id}
                      onClick={() => setSelectedId(client.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                        selectedId === client.id
                          ? "bg-primary/10 ring-1 ring-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {client.legal_business_name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {client.first_name} {client.last_name} &middot;{" "}
                          {email || "No email"}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                onClick={handleInvite}
                disabled={!selectedId || sending || uninvited.length === 0}
              >
                {sending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Send Invite
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
