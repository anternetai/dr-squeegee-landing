"use client"

import { useState, useCallback } from "react"
import { Plus, Trash2, Copy, Check, ExternalLink } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { formatCurrency } from "@/lib/portal/format"
import type { CrmProspect } from "@/lib/portal/types"

interface LineItem {
  description: string
  qty: number
  unit_price_cents: number
  subtotal_cents: number
}

interface QuoteBuilderDialogProps {
  prospect: CrmProspect
  open: boolean
  onOpenChange: (open: boolean) => void
}

function parseDollars(value: string): number {
  const num = parseFloat(value.replace(/[^0-9.]/g, ""))
  return isNaN(num) ? 0 : Math.round(num * 100)
}

function defaultLineItem(): LineItem {
  return { description: "", qty: 1, unit_price_cents: 0, subtotal_cents: 0 }
}

export function QuoteBuilderDialog({
  prospect,
  open,
  onOpenChange,
}: QuoteBuilderDialogProps) {
  const [title, setTitle] = useState("HomeField Hub – Service Proposal")
  const [description, setDescription] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([defaultLineItem()])
  const [saving, setSaving] = useState(false)
  const [quoteUrl, setQuoteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalCents = lineItems.reduce((sum, item) => sum + item.subtotal_cents, 0)

  const updateLineItem = useCallback(
    (index: number, field: keyof LineItem, rawValue: string | number) => {
      setLineItems((prev) => {
        const next = [...prev]
        const item = { ...next[index] }

        if (field === "description") {
          item.description = rawValue as string
        } else if (field === "qty") {
          const qty = Math.max(1, parseInt(String(rawValue), 10) || 1)
          item.qty = qty
          item.subtotal_cents = qty * item.unit_price_cents
        } else if (field === "unit_price_cents") {
          const cents = parseDollars(String(rawValue))
          item.unit_price_cents = cents
          item.subtotal_cents = item.qty * cents
        }

        next[index] = item
        return next
      })
    },
    []
  )

  function addLineItem() {
    setLineItems((prev) => [...prev, defaultLineItem()])
  }

  function removeLineItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleCreate() {
    if (!title.trim()) {
      setError("Please enter a title.")
      return
    }
    if (lineItems.length === 0) {
      setError("Please add at least one line item.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch("/api/portal/admin/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prospect_id: prospect.id,
          prospect_name: prospect.name,
          prospect_phone: prospect.phone ?? undefined,
          prospect_email: prospect.email ?? undefined,
          title: title.trim(),
          description: description.trim() || undefined,
          line_items: lineItems,
          total_cents: totalCents,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create quote")
      }

      const token: string = data.quote.token
      const url = `https://homefieldhub.com/q/${token}`
      setQuoteUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  async function handleCopy() {
    if (!quoteUrl) return
    await navigator.clipboard.writeText(quoteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOpenChange(open: boolean) {
    if (!open) {
      // Reset form on close
      setTitle("HomeField Hub – Service Proposal")
      setDescription("")
      setLineItems([defaultLineItem()])
      setQuoteUrl(null)
      setCopied(false)
      setError(null)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Quote to {prospect.name}</DialogTitle>
          <DialogDescription>
            Build a proposal and generate a shareable link to text or email.
          </DialogDescription>
        </DialogHeader>

        {!quoteUrl ? (
          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="quote-title">Title</Label>
              <Input
                id="quote-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="HomeField Hub – Service Proposal"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="quote-description">
                Description{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Textarea
                id="quote-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief overview of the services being proposed..."
                rows={3}
              />
            </div>

            <Separator />

            {/* Line Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[1fr_64px_100px_80px_32px] gap-2 px-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Description
                </span>
                <span className="text-xs font-medium text-muted-foreground text-center">
                  Qty
                </span>
                <span className="text-xs font-medium text-muted-foreground text-right">
                  Unit Price
                </span>
                <span className="text-xs font-medium text-muted-foreground text-right">
                  Subtotal
                </span>
                <span />
              </div>

              {lineItems.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_64px_100px_80px_32px] gap-2 items-center"
                >
                  <Input
                    placeholder="e.g. Gutter cleaning"
                    value={item.description}
                    onChange={(e) =>
                      updateLineItem(index, "description", e.target.value)
                    }
                  />
                  <Input
                    type="number"
                    min={1}
                    value={item.qty}
                    onChange={(e) => updateLineItem(index, "qty", e.target.value)}
                    className="text-center"
                  />
                  <Input
                    placeholder="$0.00"
                    value={
                      item.unit_price_cents > 0
                        ? (item.unit_price_cents / 100).toFixed(2)
                        : ""
                    }
                    onChange={(e) =>
                      updateLineItem(index, "unit_price_cents", e.target.value)
                    }
                    className="text-right"
                  />
                  <div className="text-right text-sm font-medium tabular-nums">
                    {item.subtotal_cents > 0
                      ? formatCurrency(item.subtotal_cents / 100, true)
                      : <span className="text-muted-foreground">—</span>
                    }
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    disabled={lineItems.length === 1}
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="mt-1"
              >
                <Plus className="size-3.5 mr-1" />
                Add Line Item
              </Button>
            </div>

            <Separator />

            {/* Total */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <span className="font-semibold text-sm">Total</span>
              <span className="text-lg font-bold tabular-nums">
                {formatCurrency(totalCents / 100, true)}
              </span>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving || !title.trim()}>
                {saving ? "Creating…" : "Create Quote"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Link Ready State */
          <div className="space-y-5">
            <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-5 text-center">
              <div className="mb-2 text-2xl">🎉</div>
              <p className="text-lg font-bold text-green-900">Link Ready!</p>
              <p className="mt-1 text-sm text-green-700">
                Copy the link below and text it to {prospect.name}.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quote Link</Label>
              <div className="flex gap-2">
                <Input
                  value={quoteUrl}
                  readOnly
                  className="font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  title="Copy link"
                >
                  {copied ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => window.open(quoteUrl, "_blank")}
                  title="Preview"
                >
                  <ExternalLink className="size-4" />
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              The prospect will see Accept, Request Revision, and Decline buttons.
            </p>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setQuoteUrl(null)
                  setTitle("HomeField Hub – Service Proposal")
                  setDescription("")
                  setLineItems([defaultLineItem()])
                  setError(null)
                }}
              >
                New Quote
              </Button>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
