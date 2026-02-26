import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { QuoteView } from "./quote-view"

interface LineItem {
  description: string
  qty: number
  unit_price_cents: number
  subtotal_cents: number
}

export interface Quote {
  id: string
  token: string
  prospect_name: string
  prospect_phone: string | null
  prospect_email: string | null
  title: string
  description: string | null
  line_items: LineItem[]
  total_cents: number
  status: "pending" | "accepted" | "revision_requested" | "declined"
  revision_notes: string | null
  viewed_at: string | null
  responded_at: string | null
  expires_at: string | null
  created_at: string
}

export const dynamic = "force-dynamic"

export default async function QuotePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const supabase = await createClient()

  const { data: quote, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("token", token)
    .single()

  if (error || !quote) {
    notFound()
  }

  // Mark as viewed on first load (server-side)
  if (!quote.viewed_at) {
    await supabase
      .from("quotes")
      .update({ viewed_at: new Date().toISOString() })
      .eq("token", token)
  }

  return <QuoteView quote={quote as Quote} />
}
