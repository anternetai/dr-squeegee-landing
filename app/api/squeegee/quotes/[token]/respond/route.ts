import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

type QuoteAction = 'accepted' | 'declined' | 'help'

interface QuoteService {
  name: string
  price: number
}

interface SqueegeeQuote {
  id: string
  token: string
  job_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  address: string
  services: QuoteService[]
  total_price: number
  status: string
  client_response_at: string | null
  created_at: string
}

async function sendSlackNotification(quote: SqueegeeQuote) {
  const services = Array.isArray(quote.services) ? quote.services : []
  const serviceNames = services.map((s: QuoteService) => s.name).join(', ')
  const text =
    `✅ *Quote Accepted!*\n*Client:* ${quote.client_name}\n*Address:* ${quote.address}\n*Services:* ${serviceNames}\n*Total:* $${Number(quote.total_price).toFixed(2)}\n\nText them to confirm: ${quote.client_phone ?? 'N/A'}`

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: 'U08BPEYRZEF',
      text,
    }),
  })

  const result = await response.json() as { ok: boolean; error?: string }
  if (!result.ok) {
    console.error('Slack notification failed:', result.error)
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = (await request.json()) as { action: QuoteAction }
    const { action } = body

    if (!['accepted', 'declined', 'help'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const supabase = getAdmin()

    // Fetch quote first
    const { data: quote, error: fetchError } = await supabase
      .from('squeegee_quotes')
      .select('*')
      .eq('token', token)
      .single()

    if (fetchError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    // Update status
    const { error: updateError } = await supabase
      .from('squeegee_quotes')
      .update({
        status: action,
        client_response_at: new Date().toISOString(),
      })
      .eq('token', token)

    if (updateError) {
      console.error('Quote update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send Slack notification if accepted
    if (action === 'accepted') {
      await sendSlackNotification(quote as SqueegeeQuote)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Respond quote error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
