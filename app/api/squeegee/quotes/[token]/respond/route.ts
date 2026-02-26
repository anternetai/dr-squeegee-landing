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

const ACTION_EMOJI: Record<QuoteAction, string> = {
  accepted: '✅',
  declined: '❌',
  help: '💬',
}

const ACTION_LABEL: Record<QuoteAction, string> = {
  accepted: 'Quote Accepted!',
  declined: 'Quote Declined',
  help: 'Client Has Questions',
}

async function sendSlackNotification(quote: SqueegeeQuote, action: QuoteAction) {
  const services = Array.isArray(quote.services) ? quote.services : []
  const serviceNames = services.map((s: QuoteService) => s.name).join(', ')
  const emoji = ACTION_EMOJI[action]
  const label = ACTION_LABEL[action]

  let text = `${emoji} *${label}*\n*Client:* ${quote.client_name}\n*Address:* ${quote.address}\n*Services:* ${serviceNames}\n*Total:* $${Number(quote.total_price).toFixed(2)}`

  if (action === 'accepted') {
    text += `\n\nText them to confirm: ${quote.client_phone ?? 'N/A'}`
  } else if (action === 'help') {
    text += `\n\nThey have questions — reach out: ${quote.client_phone ?? 'N/A'}`
  }

  const response = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
    },
    body: JSON.stringify({
      channel: 'U0ABZDLENJ1',
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

    // Auto-update job status based on response
    const typedQuote = quote as SqueegeeQuote
    if (typedQuote.job_id) {
      if (action === 'accepted') {
        await supabase
          .from('squeegee_jobs')
          .update({ status: 'approved' })
          .eq('id', typedQuote.job_id)
      } else if (action === 'declined') {
        await supabase
          .from('squeegee_jobs')
          .update({ status: 'new' })
          .eq('id', typedQuote.job_id)
      }
    }

    // Send Slack notification for all responses
    await sendSlackNotification(typedQuote, action)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('Respond quote error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
