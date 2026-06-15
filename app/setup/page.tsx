'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function SetupPage() {
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // If user already has an org, send them to the app
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      const { data } = await supabase.from('org_members').select('organization_id').maybeSingle()
      if (data?.organization_id) {
        window.location.href = '/dashboard'
        return
      }
      setChecking(false)
    }
    check()
  }, [])

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { window.location.href = '/'; return }

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: name.trim(), plan: 'trial' })
      .select()
      .single()

    if (orgErr || !org) { setError(orgErr?.message || 'Could not create organization'); setSaving(false); return }

    const { error: memberErr } = await supabase.from('org_members').insert({
      user_id: user.id,
      organization_id: org.id,
      role: 'admin',
    })

    if (memberErr) { setError(memberErr.message); setSaving(false); return }

    window.location.href = '/dashboard'
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-gray-100">
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="IronFlow CRM" width={180} height={64} className="object-contain" priority />
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center">Welcome to IronFlow</h1>
        <p className="text-sm text-gray-400 text-center mt-1 mb-6">Enter your dealership name to get started</p>
        <form onSubmit={handle} className="space-y-4">
          <input required autoFocus placeholder="Dealership name *" value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={saving || !name.trim()}
            className="w-full text-white rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)' }}>
            {saving ? 'Setting up…' : '→ Create My Dealership'}
          </button>
        </form>
      </div>
    </div>
  )
}
