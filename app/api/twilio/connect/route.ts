import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const to = searchParams.get('to') || ''
  const name = searchParams.get('name') || 'your lead'

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to ${name}. Please hold.</Say>
  <Dial callerId="${process.env.TWILIO_PHONE_NUMBER}" timeout="30">
    <Number>${to}</Number>
  </Dial>
  <Say voice="alice">The call could not be completed. Goodbye.</Say>
</Response>`

  return new NextResponse(twiml, {
    headers: { 'Content-Type': 'text/xml' },
  })
}

// Twilio also sends GET requests for some webhook verifications
export async function GET(request: NextRequest) {
  return POST(request)
}
