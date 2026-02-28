"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { SqueegeeJob } from "@/lib/squeegee/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileText, Check, Copy, Loader2, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

const QUOTE_SERVICES = [
  "House Washing",
  "Surface Cleaning",
  "Driveway",
  "Pool Deck",
  "Pavers",
] as const

const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "House Washing": "Soft wash of exterior siding, eaves, and trim",
  "Surface Cleaning": "High-pressure cleaning of walkways and patios",
  Driveway: "Full driveway pressure wash — oil stains, tire marks, buildup",
  "Pool Deck": "Pressure wash and surface treatment of pool deck",
  Pavers: "Paver pressure wash with joint sand preservation",
}

type QuoteService = (typeof QUOTE_SERVICES)[number]

interface QuoteRecord {
  id: string
  token: string
  services: { name: string; price: number }[]
  total_price: number
  status: "pending" | "accepted" | "declined" | "help"
  created_at: string
  client_response_at: string | null
}

const STATUS_BADGE: Record<QuoteRecord["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  accepted: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  declined: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  help: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
}

const STATUS_LABELS: Record<QuoteRecord["status"], string> = {
  pending: "Pending",
  accepted: "Accepted ✅",
  declined: "Declined ❌",
  help: "Questions 💬",
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "gap-1.5 transition-colors h-9",
        copied && "border-green-500 text-green-600"
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  )
}

interface Props {
  job: SqueegeeJob
}

export function QuoteBuilder({ job }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [prices, setPrices] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [pastQuotes, setPastQuotes] = useState<QuoteRecord[]>([])
  const [loadingQuotes, setLoadingQuotes] = useState(true)

  const fetchPastQuotes = useCallback(async () => {
    setLoadingQuotes(true)
    try {
      const res = await fetch(`/api/squeegee/quotes?job_id=${job.id}`)
      if (res.ok) {
        const data = (await res.json()) as QuoteRecord[]
        setPastQuotes(data)
      }
    } catch {
      // silently fail
    } finally {
      setLoadingQuotes(false)
    }
  }, [job.id])

  useEffect(() => {
    fetchPastQuotes()
  }, [fetchPastQuotes])

  const selectedServices = QUOTE_SERVICES.filter((s) => selected[s])
  const total = selectedServices.reduce((sum, s) => {
    const p = parseFloat(prices[s] ?? "")
    return sum + (isNaN(p) ? 0 : p)
  }, 0)

  const canGenerate =
    selectedServices.length > 0 &&
    selectedServices.every((s) => {
      const p = parseFloat(prices[s] ?? "")
      return !isNaN(p) && p > 0
    })

  const quoteUrl = generatedToken
    ? `https://drsqueegeeclt.com/q/${generatedToken}`
    : null

  async function handleGenerate() {
    if (!canGenerate) return
    setLoading(true)
    setError(null)

    const services = selectedServices.map((name) => ({
      name,
      price: parseFloat(prices[name]),
    }))

    try {
      const res = await fetch("/api/squeegee/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: job.id,
          client_name: job.client_name,
          client_phone: job.client_phone,
          client_email: job.client_email,
          address: job.address,
          services,
        }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Failed to create quote")
      }

      const data = (await res.json()) as { quote: { id: string; token: string } }
      setGeneratedToken(data.quote.token)
      // Refresh past quotes + page data (job status updates to "quoted")
      await fetchPastQuotes()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  function toggleService(service: QuoteService) {
    setSelected((prev) => ({ ...prev, [service]: !prev[service] }))
    if (selected[service]) {
      setPrices((prev) => {
        const next = { ...prev }
        delete next[service]
        return next
      })
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#3A6B4C]" />
          <CardTitle className="text-base">Send Quote</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Service selection */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Select Services
          </p>
          <div className="space-y-2">
            {QUOTE_SERVICES.map((service) => (
              <div key={service} className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer min-w-[160px]">
                  <input
                    type="checkbox"
                    checked={!!selected[service]}
                    onChange={() => toggleService(service)}
                    className="h-4 w-4 rounded border-border accent-[#3A6B4C]"
                  />
                  <div>
                    <span className="text-sm font-medium">{service}</span>
                    {SERVICE_DESCRIPTIONS[service] && (
                      <p className="text-[11px] text-muted-foreground leading-tight">{SERVICE_DESCRIPTIONS[service]}</p>
                    )}
                  </div>
                </label>
                {selected[service] && (
                  <div className="flex items-center gap-1.5 flex-1">
                    <span className="text-sm text-muted-foreground">$</span>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={prices[service] ?? ""}
                      onChange={(e) =>
                        setPrices((prev) => ({ ...prev, [service]: e.target.value }))
                      }
                      className="h-8 w-28 text-sm"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        {selectedServices.length > 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="text-base font-bold tabular-nums">
              ${total.toFixed(2)}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
            {error}
          </p>
        )}

        {/* Generate button */}
        <Button
          onClick={handleGenerate}
          disabled={!canGenerate || loading}
          className="w-full h-12 bg-[#3A6B4C] hover:bg-[#2F5A3F] text-white text-sm font-medium"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generate Quote Link
            </>
          )}
        </Button>

        {/* Generated link */}
        {quoteUrl && (
          <div className="space-y-2 bg-muted rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground">Quote Link</p>
            <div className="flex items-center gap-2 flex-wrap">
              <code className="text-xs break-all flex-1 text-foreground">{quoteUrl}</code>
              <div className="flex gap-2">
                <CopyButton text={quoteUrl} />
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 gap-1.5"
                >
                  <a href={quoteUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open
                  </a>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Copy and text this link to {job.client_name.split(" ")[0]}.
            </p>
          </div>
        )}

        {/* Past quotes */}
        {!loadingQuotes && pastQuotes.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Previous Quotes
            </p>
            <div className="space-y-2">
              {pastQuotes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between gap-2 text-xs bg-muted/50 rounded-md px-3 py-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <a
                      href={`https://drsqueegeeclt.com/q/${q.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[#3A6B4C] hover:underline truncate"
                    >
                      /q/{q.token}
                    </a>
                    <span className="text-muted-foreground hidden sm:inline">·</span>
                    <span className="text-muted-foreground hidden sm:inline tabular-nums">
                      ${Number(q.total_price).toFixed(2)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full border text-xs font-medium whitespace-nowrap",
                      STATUS_BADGE[q.status]
                    )}
                  >
                    {STATUS_LABELS[q.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
