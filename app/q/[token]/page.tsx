import { createClient } from '@supabase/supabase-js'
import { QuoteView } from './quote-view'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ token: string }>
}

interface QuoteService {
  name: string
  price: number
}

export interface SqueegeeQuote {
  id: string
  token: string
  job_id: string | null
  client_name: string
  client_phone: string | null
  client_email: string | null
  address: string
  services: QuoteService[]
  total_price: number
  status: 'pending' | 'accepted' | 'declined' | 'help'
  client_response_at: string | null
  created_at: string
}

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const metadata: Metadata = {
  title: 'Your Quote – Dr. Squeegee',
  description: 'Professional exterior cleaning service quote',
}

export default async function QuotePage({ params }: PageProps) {
  const { token } = await params
  const supabase = getAdmin()

  const { data, error } = await supabase
    .from('squeegee_quotes')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Quote Not Found</h1>
          <p className="text-gray-500 text-sm">
            This link may have expired or the quote does not exist.
          </p>
        </div>
      </div>
    )
  }

  return <QuoteView quote={data as SqueegeeQuote} />
}
