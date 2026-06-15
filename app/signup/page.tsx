'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const [form, setForm] = useState({ dealership: '', email: '', password: '', confirm: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const inp = 'w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  const handle = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true)

    // 1. Create auth user
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
    })
    if (authErr || !authData.user) {
      setError(authErr?.message || 'Failed to create account')
      setSaving(false)
      return
    }

    // 2. Create organization
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: form.dealership.trim(), plan: 'trial' })
      .select()
      .single()

    if (orgErr || !org) {
      setError(orgErr?.message || 'Failed to create organization')
      setSaving(false)
      return
    }

    // 3. Link user as admin
    const { error: memberErr } = await supabase.from('org_members').insert({
      user_id: authData.user.id,
      organization_id: org.id,
      role: 'admin',
    })
    if (memberErr) { setError(memberErr.message); setSaving(false); return }

    // If they got a session immediately (email confirm off), go to dashboard
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      window.location.href = '/dashboard'
    } else {
      setDone(true)
    }
    setSaving(false)
  }

  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-gray-100 text-center">
        <div className="text-4xl mb-3">📧</div>
        <h2 className="text-lg font-bold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-500 mt-2">We sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your account.</p>
        <Link href="/" className="block mt-5 text-sm text-[#367C2B] font-medium hover:underline">← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm border border-gray-100">
        <div className="flex justify-center mb-5">
          <Image src="/logo.png" alt="IronFlow CRM" width={180} height={64} className="object-contain" priority />
        </div>
        <h1 className="text-xl font-bold text-gray-900 text-center">Start your free trial</h1>
        <p className="text-sm text-gray-400 text-center mt-1 mb-6">Set up your dealership in 60 seconds</p>

        <form onSubmit={handle} className="space-y-3">
          <input required placeholder="Dealership name *" value={form.dealership}
            onChange={e => setForm({ ...form, dealership: e.target.value })} className={inp} />
          <input required type="email" placeholder="Work email *" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} className={inp} />
          <input required type="password" placeholder="Password *" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} className={inp} />
          <input required type="password" placeholder="Confirm password *" value={form.confirm}
            onChange={e => setForm({ ...form, confirm: e.target.value })} className={inp} />

          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full text-white rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)', boxShadow: '0 4px 14px rgba(54,124,43,0.35)' }}>
            {saving ? 'Creating account…' : '→ Create Account'}
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500">
            Already have an account?{' '}
            <Link href="/" className="text-[#367C2B] font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
