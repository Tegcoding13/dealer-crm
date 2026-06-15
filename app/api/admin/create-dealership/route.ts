import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['tegnarski13@gmail.com', 'tegcoding13@gmail.com']

export async function POST(req: NextRequest) {
  // Verify caller is the admin
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { dealershipName, email, password } = await req.json()
  if (!dealershipName || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  // Create auth user (server-side, bypasses signup page)
  const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (userErr || !newUser.user) {
    return NextResponse.json({ error: userErr?.message || 'Failed to create user' }, { status: 500 })
  }

  // Create organization
  const { data: org, error: orgErr } = await supabaseAdmin
    .from('organizations')
    .insert({ name: dealershipName, plan: 'trial' })
    .select()
    .single()
  if (orgErr || !org) {
    return NextResponse.json({ error: orgErr?.message || 'Failed to create org' }, { status: 500 })
  }

  // Link user as admin
  const { error: memberErr } = await supabaseAdmin.from('org_members').insert({
    user_id: newUser.user.id,
    organization_id: org.id,
    role: 'admin',
  })
  if (memberErr) {
    return NextResponse.json({ error: memberErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, org: { id: org.id, name: org.name } })
}
