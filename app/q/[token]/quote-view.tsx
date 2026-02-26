"use client"

import { useState } from "react"
import type { Quote } from "./page"

interface LineItem {
  description: string
  qty: number
  unit_price_cents: number
  subtotal_cents: number
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100)
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr))
}

type ResponseState = "idle" | "accepting" | "revising" | "declining" | "submitted" | "error"

export function QuoteView({ quote }: { quote: Quote }) {
  const [responseState, setResponseState] = useState<ResponseState>("idle")
  const [revisionNotes, setRevisionNotes] = useState("")
  const [submittedAction, setSubmittedAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isExpired = quote.expires_at && new Date(quote.expires_at) < new Date()
  const alreadyResponded = quote.status !== "pending"

  async function submitResponse(
    action: "accepted" | "revision_requested" | "declined",
    notes?: string
  ) {
    setErrorMessage(null)
    try {
      const res = await fetch(`/api/quotes/${quote.token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, revision_notes: notes }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Something went wrong")
      }

      setSubmittedAction(action)
      setResponseState("submitted")
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong")
      setResponseState("error")
    }
  }

  const lineItems: LineItem[] = Array.isArray(quote.line_items) ? quote.line_items : []

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-500">
              <svg
                className="h-5 w-5 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9,22 9,12 15,12 15,22" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">HomeField Hub</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white shadow-2xl">
          {/* Card Header */}
          <div className="border-b border-gray-100 px-6 py-6 sm:px-8">
            <p className="mb-1 text-sm text-gray-500">Prepared for</p>
            <h1 className="text-2xl font-bold text-gray-900">{quote.prospect_name}</h1>
            <p className="mt-0.5 text-sm text-gray-400">
              Sent {formatDate(quote.created_at)}
              {quote.expires_at && !isExpired && (
                <> · Expires {formatDate(quote.expires_at)}</>
              )}
            </p>
          </div>

          {/* Proposal Title + Description */}
          <div className="px-6 py-6 sm:px-8">
            <h2 className="text-xl font-semibold text-gray-900">{quote.title}</h2>
            {quote.description && (
              <p className="mt-2 text-gray-600 leading-relaxed">{quote.description}</p>
            )}
          </div>

          {/* Line Items */}
          {lineItems.length > 0 && (
            <div className="px-6 sm:px-8">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                        Qty
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                        Unit Price
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-600 whitespace-nowrap">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((item, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3 text-gray-800">{item.description}</td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                          {item.qty}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                          {formatCurrency(item.unit_price_cents)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800 tabular-nums">
                          {formatCurrency(item.subtotal_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td
                        colSpan={3}
                        className="px-4 py-3 text-right font-bold text-gray-900"
                      >
                        Total
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900 text-base tabular-nums">
                        {formatCurrency(quote.total_cents)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Response Section */}
          <div className="px-6 py-8 sm:px-8">
            {/* Expired */}
            {isExpired && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-center">
                <p className="font-semibold text-amber-800">This quote has expired</p>
                <p className="mt-1 text-sm text-amber-600">
                  Please contact us to receive an updated proposal.
                </p>
              </div>
            )}

            {/* Already responded */}
            {!isExpired && alreadyResponded && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 text-center">
                <p className="font-semibold text-gray-800">
                  {quote.status === "accepted" && "✅ You accepted this proposal"}
                  {quote.status === "revision_requested" &&
                    "✏️ You requested a revision"}
                  {quote.status === "declined" && "You declined this proposal"}
                </p>
                {quote.revision_notes && (
                  <p className="mt-2 text-sm text-gray-500 italic">
                    &ldquo;{quote.revision_notes}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-xs text-gray-400">
                  Response received — we&apos;ll be in touch shortly.
                </p>
              </div>
            )}

            {/* Submitted this session */}
            {!isExpired && !alreadyResponded && responseState === "submitted" && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 text-center">
                <div className="mb-2 text-3xl">
                  {submittedAction === "accepted" && "✅"}
                  {submittedAction === "revision_requested" && "✏️"}
                  {submittedAction === "declined" && "👋"}
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {submittedAction === "accepted" && "Proposal Accepted!"}
                  {submittedAction === "revision_requested" && "Revision Requested"}
                  {submittedAction === "declined" && "Got it — thanks for letting us know"}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {submittedAction === "accepted"
                    ? "We'll be reaching out shortly to get everything scheduled."
                    : submittedAction === "revision_requested"
                    ? "We'll review your notes and send an updated proposal."
                    : "If you change your mind, don't hesitate to reach out."}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            {!isExpired && !alreadyResponded && responseState === "idle" && (
              <div className="space-y-3">
                <p className="mb-4 text-center text-sm font-medium text-gray-500">
                  How would you like to proceed?
                </p>
                <button
                  onClick={() => submitResponse("accepted")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-6 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-green-600 active:scale-[0.98]"
                >
                  ✅ Accept Proposal
                </button>
                <button
                  onClick={() => setResponseState("revising")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  ✏️ Request Revision
                </button>
                <button
                  onClick={() => setResponseState("declining")}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3.5 text-base font-semibold text-gray-400 transition hover:bg-gray-50 active:scale-[0.98]"
                >
                  ❌ Decline
                </button>
              </div>
            )}

            {/* Accepting state */}
            {responseState === "accepting" && (
              <div className="text-center py-4 text-gray-500">Submitting…</div>
            )}

            {/* Revision form */}
            {responseState === "revising" && (
              <div className="space-y-4">
                <p className="text-sm font-medium text-gray-700">
                  What would you like us to change?
                </p>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Describe what you'd like revised..."
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <div className="flex gap-3">
                  <button
                    onClick={() => setResponseState("idle")}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() =>
                      submitResponse("revision_requested", revisionNotes)
                    }
                    disabled={!revisionNotes.trim()}
                    className="flex-1 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send Revision Request
                  </button>
                </div>
              </div>
            )}

            {/* Decline confirmation */}
            {responseState === "declining" && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Are you sure you want to decline this proposal?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResponseState("idle")}
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => submitResponse("declined")}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-3 text-sm font-semibold text-white hover:bg-red-600"
                  >
                    Yes, Decline
                  </button>
                </div>
              </div>
            )}

            {/* Error state */}
            {responseState === "error" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-center">
                  <p className="font-semibold text-red-800">Something went wrong</p>
                  {errorMessage && (
                    <p className="mt-1 text-sm text-red-600">{errorMessage}</p>
                  )}
                </div>
                <button
                  onClick={() => setResponseState("idle")}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-gray-600">
          HomeField Hub · homefieldhub.com
        </p>
      </div>
    </div>
  )
}
