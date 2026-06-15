'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Org = { id: string; name: string; plan: string; created_at: string }

const ADMIN_EMAIL = 'tegnarski13@gmail.com'

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [form, setForm] = useState({ dealershipName: '', email: '', password: '' })
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || user.email !== ADMIN_EMAIL) { setAllowed(false); return }
      setAllowed(true)
      fetchOrgs()
    }
    init()
  }, [])

  const fetchOrgs = async () => {
    const { data } = await supabase
      .from('organizations')
      .select('id, name, plan, created_at')
      .order('created_at', { ascending: false })
    setOrgs(data || [])
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setResult(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) { setResult({ type: 'error', msg: 'Not logged in' }); setSaving(false); return }

    const res = await fetch('/api/admin/create-dealership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setResult({ type: 'error', msg: data.error || 'Something went wrong' })
    } else {
      setResult({ type: 'success', msg: `✓ Created "${data.org.name}" successfully` })
      setForm({ dealershipName: '', email: '', password: '' })
      fetchOrgs()
    }
    setSaving(false)
  }

  if (allowed === null) return <AppLayout><div className="flex items-center justify-center h-64 text-gray-400">Loading…</div></AppLayout>
  if (allowed === false) return <AppLayout><div className="flex items-center justify-center h-64 text-red-400">Access denied.</div></AppLayout>

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>

        {/* Create dealership form */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Create New Dealership</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dealership name *</label>
                <input required placeholder="Green Valley Motors" value={form.dealershipName}
                  onChange={e => setForm({ ...form, dealershipName: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Login email *</label>
                <input required type="email" placeholder="admin@dealership.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temporary password *</label>
                <input required type="text" placeholder="TempPass123!" value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })} className={inp} />
              </div>
            </div>

            {result && (
              <p className={`text-sm px-3 py-2 rounded-lg ${result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {result.msg}
              </p>
            )}

            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50"
              style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)' }}>
              {saving ? 'Creating…' : '+ Create Dealership'}
            </button>
          </form>
        </div>

        {/* Existing orgs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">All Dealerships ({orgs.length})</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Plan</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map(org => (
                <tr key={org.id}>
                  <td className="px-5 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${org.plan === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {org.plan}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400">{new Date(org.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {orgs.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-gray-400">No dealerships yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  )
}
