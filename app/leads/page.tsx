'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOrgId } from '@/lib/use-org-id'
import { useEmployees } from '@/lib/use-employees'
import AppLayout from '../components/AppLayout'

type Lead = {
  id: string
  name: string
  company: string | null
  type: string
  phone: string | null
  email: string | null
  stage: string
  value: number
  address: string | null
  source: string | null
  owner: string | null
  created_at: string
}

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'closed-won', 'closed-lost']

const SOURCES = ['Referral', 'Website', 'Walk-in', 'Social Media', 'Cold Call', 'Event', 'Email Campaign', 'Other']

const STAGE_COLORS: Record<string, string> = {
  'new': 'bg-gray-100 text-gray-600',
  'contacted': 'bg-blue-100 text-blue-700',
  'qualified': 'bg-yellow-100 text-yellow-700',
  'proposal': 'bg-purple-100 text-purple-700',
  'closed-won': 'bg-green-100 text-green-700',
  'closed-lost': 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  'new': 'New',
  'contacted': 'Contacted',
  'qualified': 'Qualified',
  'proposal': 'Proposal',
  'closed-won': '✓ Won',
  'closed-lost': '✕ Lost',
}

const EMPTY_FORM = {
  firstName: '', lastName: '', company: '', phone: '', email: '',
  address: '', source: '', owner: '', stage: 'new', value: ''
}

export default function LeadsPage() {
  const orgId = useOrgId()
  const employees = useEmployees()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState('all')

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setLeads(data || [])
    setLoading(false)
  }

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName) { setFormError('First name is required.'); return }

    const fullName = lastName ? `${firstName} ${lastName}` : firstName

    if (!orgId) { setFormError('Organization not loaded yet — please wait a moment and try again.'); return }

    setSaving(true)
    const { data: newLead, error } = await supabase.from('leads').insert({
      name: fullName,
      company: form.company || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      source: form.source || null,
      owner: form.owner || null,
      stage: form.stage,
      value: parseFloat(form.value) || 0,
      organization_id: orgId,
    }).select('id').single()

    if (error) {
      setFormError(error.message)
    } else if (newLead) {
      const addDays = (n: number) => {
        const d = new Date()
        d.setDate(d.getDate() + n)
        return d.toISOString().slice(0, 10)
      }
      await supabase.from('tasks').insert([
        {
          lead_id: newLead.id,
          title: 'Follow-up call (3 day)',
          assigned_to: form.owner || null,
          due_date: addDays(3),
          status: 'open',
          organization_id: orgId,
        },
        {
          lead_id: newLead.id,
          title: 'Follow-up call (2 week)',
          assigned_to: form.owner || null,
          due_date: addDays(14),
          status: 'open',
          organization_id: orgId,
        },
      ])
      setForm(EMPTY_FORM)
      setShowForm(false)
      fetchLeads()
    }
    setSaving(false)
  }

  const filtered = leads.filter(l => {
    const q = search.toLowerCase()
    const matchSearch = !search ||
      l.name.toLowerCase().includes(q) ||
      (l.company || '').toLowerCase().includes(q) ||
      (l.phone || '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
      (l.phone || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q) ||
      (l.address || '').toLowerCase().includes(q) ||
      (l.owner || '').toLowerCase().includes(q) ||
      (l.source || '').toLowerCase().includes(q) ||
      l.stage.toLowerCase().includes(q)
    const matchStage = stageFilter === 'all' || l.stage === stageFilter
    return matchSearch && matchStage
  })

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <AppLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
          <button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            + Add Lead
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            placeholder="Search name, phone, email, company…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All stages</option>
            {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-gray-400 py-10 text-center">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No leads found</p>
            <p className="text-sm mt-1">{leads.length === 0 ? 'Click "+ Add Lead" to get started' : 'Try a different search or filter'}</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => router.push(`/leads/${lead.id}`)}>
                    <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.company || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STAGE_COLORS[lead.stage] || 'bg-gray-100 text-gray-700'}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">${lead.value.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.owner || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{lead.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add lead modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Lead</h2>
            <form onSubmit={handleAddLead} className="space-y-3">

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <input required placeholder="First name *" value={form.firstName}
                  onChange={e => setForm({ ...form, firstName: e.target.value })} className={inp} />
                <input placeholder="Last name" value={form.lastName}
                  onChange={e => setForm({ ...form, lastName: e.target.value })} className={inp} />
              </div>

              {/* Company */}
              <input placeholder="Company" value={form.company}
                onChange={e => setForm({ ...form, company: e.target.value })} className={inp} />

              {/* Phone + Email */}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Phone" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} className={inp} />
                <input placeholder="Email" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} className={inp} />
              </div>

              {/* Address */}
              <input placeholder="Address" value={form.address}
                onChange={e => setForm({ ...form, address: e.target.value })} className={inp} />

              {/* Source dropdown */}
              <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className={inp}>
                <option value="">Select source…</option>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              {/* Owner dropdown */}
              <select value={form.owner} onChange={e => setForm({ ...form, owner: e.target.value })} className={inp}>
                <option value="">Select owner…</option>
                {employees.map(o => <option key={o} value={o}>{o}</option>)}
              </select>

              {/* Value + Stage */}
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Deal value ($)" type="number" value={form.value}
                  onChange={e => setForm({ ...form, value: e.target.value })} className={inp} />
                <select value={form.stage} onChange={e => setForm({ ...form, stage: e.target.value })} className={inp}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
