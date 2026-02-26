import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

interface QuoteService {
  name: string
  price: number
}

interface CreateQuoteBody {
  job_id?: string
  client_name: string
  client_phone?: string
  client_email?: string
  address: string
  services: QuoteService[]
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CreateQuoteBody

    const { job_id, client_name, client_phone, client_email, address, services } = body

    if (!client_name || !address || !services || services.length === 0) {
      return NextResponse.json(
        { error: 'client_name, address, and services are required' },
        { status: 400 }
      )
    }

    const total_price = services.reduce((sum, s) => sum + Number(s.price), 0)

    const supabase = getAdmin()

    const { data, error } = await supabase
      .from('squeegee_quotes')
      .insert({
        job_id: job_id ?? null,
        client_name,
        client_phone: client_phone ?? null,
        client_email: client_email ?? null,
        address,
        services,
        total_price,
      })
      .select('id, token')
      .single()

    if (error) {
      console.error('Quote insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ quote: data })
  } catch (err) {
    console.error('Create quote error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const job_id = searchParams.get('job_id')

    if (!job_id) {
      return NextResponse.json({ error: 'job_id is required' }, { status: 400 })
    }

    const supabase = getAdmin()

    const { data, error } = await supabase
      .from('squeegee_quotes')
      .select('*')
      .eq('job_id', job_id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (err) {
    console.error('Get quotes error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
