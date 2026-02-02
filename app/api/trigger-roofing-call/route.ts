import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, name, address, roofingConcern } = await request.json()

    // VAPI credentials - use roofing-specific assistant if configured
    const VAPI_API_KEY = process.env.VAPI_API_KEY
    const VAPI_ROOFING_ASSISTANT_ID = process.env.VAPI_ROOFING_ASSISTANT_ID || process.env.VAPI_ASSISTANT_ID

    if (!VAPI_API_KEY || !VAPI_ROOFING_ASSISTANT_ID) {
      console.log('VAPI not configured yet for roofing')
      return NextResponse.json({ success: false, message: 'VAPI not configured' }, { status: 200 })
    }

    // Format phone number (remove non-digits, add +1 if needed)
    let formattedPhone = phone.replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = '+1' + formattedPhone
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone
    }

    // Map roofingConcern to readable text for the AI
    const concernLabels: Record<string, string> = {
      storm_damage: 'storm or hail damage',
      leak: 'a leak or water damage',
      age: 'the roof getting old',
      insurance: 'help with an insurance claim',
      selling: 'selling their home',
      checkup: 'just wanting it checked out',
    }
    const concernText = concernLabels[roofingConcern] || roofingConcern

    // VAPI phone number ID for outbound calls
    const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID || '5589e5e2-6c0b-4760-a00c-a08b70a7c460'

    // Trigger VAPI outbound call
    const vapiResponse = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        assistantId: VAPI_ROOFING_ASSISTANT_ID,
        phoneNumberId: VAPI_PHONE_NUMBER_ID,
        customer: {
          number: formattedPhone,
          name: name,
        },
        assistantOverrides: {
          variableValues: {
            customerName: name,
            customerAddress: address,
            roofingConcern: concernText,
          }
        }
      }),
    })

    if (!vapiResponse.ok) {
      const error = await vapiResponse.text()
      console.error('VAPI error:', error)
      return NextResponse.json({ success: false, error }, { status: 500 })
    }

    const data = await vapiResponse.json()
    console.log('VAPI call triggered successfully:', data.id)
    return NextResponse.json({ success: true, callId: data.id })

  } catch (error) {
    console.error('Error triggering roofing call:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to trigger call' },
      { status: 500 }
    )
  }
}
