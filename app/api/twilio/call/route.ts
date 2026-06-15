import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export async function POST(request: NextRequest) {
  try {
    const { leadPhone, leadName } = await request.json()

    if (!leadPhone) {
      return NextResponse.json({ error: 'Lead has no phone number' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ironflowcrm.com'

    const call = await client.calls.create({
      to: process.env.MY_PHONE_NUMBER!,
      from: process.env.TWILIO_PHONE_NUMBER!,
      url: `${baseUrl}/api/twilio/connect?to=${encodeURIComponent(leadPhone)}&name=${encodeURIComponent(leadName || 'your lead')}`,
    })

    return NextResponse.json({ callSid: call.sid, status: call.status })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
