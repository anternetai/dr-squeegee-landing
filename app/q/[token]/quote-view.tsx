"use client"

import { useState } from "react"
import type { SqueegeeQuote } from "./page"

const PREP_INSTRUCTIONS: Record<string, string> = {
  "House Washing":
    "Please close all windows and doors before we arrive. Remove any fragile items or outdoor décor from the area.",
  "Surface Cleaning":
    "Please clear the driveway/surface of vehicles and any items you'd like to protect.",
  Driveway:
    "Please clear the driveway/surface of vehicles and any items you'd like to protect.",
  "Pool Deck":
    "Please remove pool furniture and any items from the deck area.",
  Pavers:
    "Please clear the paver area of furniture and decorative items.",
}

const RESPONSE_MESSAGES: Record<string, string> = {
  accepted:
    "Quote accepted! Anthony from Dr. Squeegee will reach out shortly to confirm your appointment.",
  declined: "Got it! We'll remove you from our list.",
  help: "Got it! Anthony will reach out shortly.",
}

interface Props {
  quote: SqueegeeQuote
}

export function QuoteView({ quote: initialQuote }: Props) {
  const [quote, setQuote] = useState(initialQuote)
  const [submitting, setSubmitting] = useState(false)
  const [responseMessage, setResponseMessage] = useState<string | null>(
    initialQuote.status !== "pending" ? RESPONSE_MESSAGES[initialQuote.status] ?? null : null
  )

  const services = Array.isArray(quote.services) ? quote.services : []

  // Unique prep instructions for selected services
  const prepInstructions = Array.from(
    new Set(services.map((s) => PREP_INSTRUCTIONS[s.name]).filter(Boolean))
  )

  async function handleAction(action: "accepted" | "declined" | "help") {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/squeegee/quotes/${quote.token}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (res.ok) {
        setQuote((prev) => ({ ...prev, status: action }))
        setResponseMessage(RESPONSE_MESSAGES[action])
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const alreadyResponded = quote.status !== "pending"

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-5">
        {/* Header */}
        <div className="text-center pb-2">
          <div className="inline-flex items-center gap-2 mb-1">
            <span className="text-2xl font-black text-blue-700 tracking-tight">Dr. Squeegee</span>
          </div>
          <p className="text-sm text-gray-500">Professional Exterior Cleaning</p>
        </div>

        {/* Quote details */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-blue-50">
            <h1 className="text-lg font-bold text-gray-900">Service Quote</h1>
            <p className="text-sm text-gray-600 mt-0.5">{quote.client_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{quote.address}</p>
          </div>
          <div className="px-5 py-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400 border-b">
                  <th className="text-left pb-2 font-medium">Service</th>
                  <th className="text-right pb-2 font-medium">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {services.map((s, i) => (
                  <tr key={i}>
                    <td className="py-2.5 text-gray-800 font-medium">{s.name}</td>
                    <td className="py-2.5 text-right text-gray-800 tabular-nums">
                      ${Number(s.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td className="pt-3 font-bold text-gray-900">Total</td>
                  <td className="pt-3 text-right font-black text-blue-700 text-base tabular-nums">
                    ${Number(quote.total_price).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Prep Instructions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">📋 Service Prep Instructions</h2>
          </div>
          <div className="px-5 py-4 space-y-2">
            {prepInstructions.map((instruction, i) => (
              <div key={i} className="flex gap-2.5 text-sm text-gray-700">
                <span className="text-blue-500 mt-0.5 shrink-0">•</span>
                <span>{instruction}</span>
              </div>
            ))}
            <div className="flex gap-2.5 text-sm text-gray-700">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
              <span>
                Our team will treat your property with care. If you have any concerns, let us
                know before we begin.
              </span>
            </div>
          </div>
        </div>

        {/* Service Agreement */}
        <div className="bg-amber-50 rounded-2xl border border-amber-100 px-5 py-4">
          <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">
            Service Agreement
          </h2>
          <p className="text-xs text-amber-700 leading-relaxed">
            By accepting this quote, you agree that Dr. Squeegee is not liable for: pre-existing
            damage, items left in the service area, or damage resulting from conditions beyond
            our control (deteriorated surfaces, improper installation, etc.). Service is
            weather-dependent and may be rescheduled.
          </p>
        </div>

        {/* Action buttons or response */}
        {responseMessage ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-5 py-6 text-center">
            {quote.status === "accepted" && (
              <p className="text-4xl mb-3">✅</p>
            )}
            {quote.status === "declined" && (
              <p className="text-4xl mb-3">👋</p>
            )}
            {quote.status === "help" && (
              <p className="text-4xl mb-3">💬</p>
            )}
            <p className="text-gray-800 font-medium text-base">{responseMessage}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={() => handleAction("accepted")}
              disabled={submitting || alreadyResponded}
              className="w-full h-14 rounded-xl bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              ✅ Accept Quote
            </button>
            <button
              onClick={() => handleAction("help")}
              disabled={submitting || alreadyResponded}
              className="w-full h-14 rounded-xl bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-semibold text-base border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              💬 I Have Questions
            </button>
            <button
              onClick={() => handleAction("declined")}
              disabled={submitting || alreadyResponded}
              className="w-full h-14 rounded-xl bg-white hover:bg-red-50 active:bg-red-100 text-red-600 font-semibold text-base border border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              ❌ Decline
            </button>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Dr. Squeegee · Professional Exterior Cleaning
        </p>
      </div>
    </div>
  )
}
