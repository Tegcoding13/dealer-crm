import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAILS = ['tegnarski13@gmail.com', 'tegcoding13@gmail.com']

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) return null
  return user
}

// GET — list all users grouped by org
export async function GET(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const [{ data: orgs }, { data: members }, { data: { users } }] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, name, plan, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('org_members').select('user_id, organization_id, role'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const userMap = Object.fromEntries(users.map(u => [u.id, u]))

  const result = (orgs || []).map(org => ({
    ...org,
    users: (members || [])
      .filter(m => m.organization_id === org.id)
      .map(m => ({
        id: m.user_id,
        email: userMap[m.user_id]?.email || 'Unknown',
        role: m.role,
        created_at: userMap[m.user_id]?.created_at,
      })),
  }))

  return NextResponse.json(result)
}

// PATCH — update user email or password
export async function PATCH(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId, email, password } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (email) updates.email = email
  if (password) updates.password = password

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// DELETE — remove a user and their org membership
export async function DELETE(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 })

  await supabaseAdmin.from('org_members').delete().eq('user_id', userId)
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

// POST — add existing or new user to a specific org
export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { orgId, email, password, role = 'member' } = await req.json()
  if (!orgId || !email || !password) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: newUser, error: userErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (userErr || !newUser.user) return NextResponse.json({ error: userErr?.message || 'Failed to create user' }, { status: 500 })

  const { error: memberErr } = await supabaseAdmin.from('org_members').insert({
    user_id: newUser.user.id, organization_id: orgId, role,
  })
  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  return NextResponse.json({ success: true, userId: newUser.user.id })
}
