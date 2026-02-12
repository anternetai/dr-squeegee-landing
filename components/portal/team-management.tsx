"use client"

import { use, useState, useEffect } from "react"
import { Users, UserPlus, Trash2, Pencil, Loader2 } from "lucide-react"
import { PortalAuthContext } from "./portal-auth-provider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TEAM_ROLE_CONFIG } from "@/lib/portal/constants"
import type { TeamMember, TeamMemberRole } from "@/lib/portal/types"

export function TeamManagement() {
  const { user, teamMember } = use(PortalAuthContext)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteFirstName, setInviteFirstName] = useState("")
  const [inviteLastName, setInviteLastName] = useState("")
  const [inviteRole, setInviteRole] = useState("viewer")
  const [error, setError] = useState<string | null>(null)

  const isPrimary = user && !teamMember

  useEffect(() => {
    if (!isPrimary) {
      setLoading(false)
      return
    }
    fetchMembers()
  }, [isPrimary])

  async function fetchMembers() {
    try {
      const res = await fetch("/api/portal/team")
      if (res.ok) {
        const data = await res.json()
        setMembers(data.members ?? [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/portal/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          first_name: inviteFirstName.trim() || undefined,
          last_name: inviteLastName.trim() || undefined,
          role: inviteRole,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "Failed to send invite")
        return
      }
      setInviteOpen(false)
      setInviteEmail("")
      setInviteFirstName("")
      setInviteLastName("")
      setInviteRole("viewer")
      await fetchMembers()
    } finally {
      setSaving(false)
    }
  }

  async function handleRoleUpdate(memberId: string, role: string) {
    const res = await fetch(`/api/portal/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, role: role as TeamMemberRole } : m)
      )
    }
    setEditingId(null)
  }

  async function handleDelete() {
    if (!deleteId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/portal/team/${deleteId}`, { method: "DELETE" })
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== deleteId))
      }
      setDeleteId(null)
    } finally {
      setSaving(false)
    }
  }

  if (!isPrimary) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" />
            Team
          </CardTitle>
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); setError(null) }}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <UserPlus className="size-3.5" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invite to join your portal. They'll receive an email to set up their account.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email *</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="team@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-first">First Name</Label>
                    <Input
                      id="invite-first"
                      placeholder="Jane"
                      value={inviteFirstName}
                      onChange={(e) => setInviteFirstName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-last">Last Name</Label>
                    <Input
                      id="invite-last"
                      placeholder="Doe"
                      value={inviteLastName}
                      onChange={(e) => setInviteLastName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TEAM_ROLE_CONFIG).map(([value, config]) => (
                        <SelectItem key={value} value={value}>
                          <span className="font-medium">{config.label}</span>
                          <span className="ml-1.5 text-muted-foreground">&mdash; {config.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={!inviteEmail.trim() || saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Invite"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="py-6 text-center">
            <Users className="mx-auto size-8 text-muted-foreground/50" />
            <p className="mt-2 text-sm text-muted-foreground">
              No team members yet. Invite someone to give them access to your portal.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {[member.first_name, member.last_name].filter(Boolean).join(" ") || member.email}
                    </p>
                    {editingId === member.id ? (
                      <Select
                        value={member.role}
                        onValueChange={(role) => handleRoleUpdate(member.id, role)}
                      >
                        <SelectTrigger className="h-7 w-[130px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(TEAM_ROLE_CONFIG).map(([value, config]) => (
                            <SelectItem key={value} value={value}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {TEAM_ROLE_CONFIG[member.role as TeamMemberRole]?.label ?? member.role}
                      </Badge>
                    )}
                  </div>
                  {(member.first_name || member.last_name) && (
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingId(editingId === member.id ? null : member.id)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(member.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              This person will lose access to the portal. You can re-invite them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDelete}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
