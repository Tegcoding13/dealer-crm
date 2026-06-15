'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useOrgId } from '@/lib/use-org-id'
import AppLayout from '../components/AppLayout'

type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  assigned_to: string | null
  status: string
  created_at: string
  lead_id: string | null
  leads?: { id: string; name: string } | null
}

const OWNERS = ['Tyler Egnarski']

export default function TasksPage() {
  const router = useRouter()
  const orgId = useOrgId()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'open' | 'done' | 'all'>('open')
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', due_date: '', assigned_to: '', lead_search: '', lead_id: '' })
  const [leadResults, setLeadResults] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchTasks() }, [statusFilter, ownerFilter])

  const fetchTasks = async () => {
    setLoading(true)
    let query = supabase
      .from('tasks')
      .select('*, leads(id, name)')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    if (ownerFilter !== 'all') query = query.eq('assigned_to', ownerFilter)

    const { data } = await query
    setTasks(data || [])
    setLoading(false)
  }

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ status: task.status === 'open' ? 'done' : 'open' }).eq('id', task.id)
    fetchTasks()
  }

  const searchLeads = async (q: string) => {
    if (!q.trim()) { setLeadResults([]); return }
    const { data } = await supabase.from('leads').select('id, name').ilike('name', `%${q}%`).limit(5)
    setLeadResults(data || [])
  }

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      due_date: form.due_date || null,
      assigned_to: form.assigned_to || null,
      lead_id: form.lead_id || null,
      status: 'open',
      organization_id: orgId,
    })
    setForm({ title: '', description: '', due_date: '', assigned_to: '', lead_search: '', lead_id: '' })
    setLeadResults([])
    setShowForm(false)
    setSaving(false)
    fetchTasks()
  }

  const now = new Date()
  const overdue = (task: Task) => task.status === 'open' && task.due_date && new Date(task.due_date) < now

  const openCount = tasks.filter(t => t.status === 'open').length
  const overdueCount = tasks.filter(t => overdue(t)).length
  const doneCount = tasks.filter(t => t.status === 'done').length

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <AppLayout>
      <div className="p-6 space-y-4 max-w-5xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">Tasks</h1>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">
            + Add Task
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open', value: openCount, color: 'text-blue-600', filter: 'open' as const },
            { label: 'Overdue', value: overdueCount, color: 'text-red-500', filter: 'open' as const },
            { label: 'Completed', value: doneCount, color: 'text-green-600', filter: 'done' as const },
          ].map(({ label, value, color, filter }) => (
            <button key={label} onClick={() => setStatusFilter(filter)}
              className={`bg-white rounded-xl border p-4 text-left transition-colors ${statusFilter === filter ? 'border-blue-400' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className="text-sm text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'open' | 'done' | 'all')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="done">Done</option>
          </select>
          <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="all">All assignees</option>
            {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Task list */}
        {loading ? (
          <div className="text-gray-400 py-10 text-center">Loading…</div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-lg">No tasks found</p>
            <p className="text-sm mt-1">Click &quot;+ Add Task&quot; to create one</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {tasks.map(task => {
              const isOverdue = overdue(task)
              const lead = Array.isArray(task.leads) ? task.leads[0] : task.leads
              return (
                <div key={task.id} className="flex items-start gap-4 px-5 py-4">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleTask(task)}
                    className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                      task.status === 'done' ? 'bg-green-500 border-green-500' : isOverdue ? 'border-red-400 hover:border-red-500' : 'border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {task.status === 'done' && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {task.due_date && (
                        <span className={`text-xs ${isOverdue ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                          {isOverdue ? '⚠ Overdue · ' : 'Due '}
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                      {task.assigned_to && (
                        <span className="text-xs text-gray-400">{task.assigned_to}</span>
                      )}
                      {lead && (
                        <button
                          onClick={() => router.push(`/leads/${lead.id}`)}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          → {lead.name}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Status badge */}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                    task.status === 'done' ? 'bg-green-100 text-green-700' : isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {task.status === 'done' ? 'Done' : isOverdue ? 'Overdue' : 'Open'}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add task modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Task</h2>
            <form onSubmit={handleAddTask} className="space-y-3">
              <input required placeholder="Task title *" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })} className={inp} />

              <textarea placeholder="Description (optional)" value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                className={inp + ' resize-none'} rows={2} />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Due date</label>
                  <input type="date" value={form.due_date}
                    onChange={e => setForm({ ...form, due_date: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Assign to</label>
                  <select value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })} className={inp}>
                    <option value="">Unassigned</option>
                    {OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Lead search */}
              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1">Link to lead (optional)</label>
                {form.lead_id ? (
                  <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    <span className="flex-1 text-gray-700">{form.lead_search}</span>
                    <button type="button" onClick={() => setForm({ ...form, lead_id: '', lead_search: '' })} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                ) : (
                  <input placeholder="Search lead name…" value={form.lead_search}
                    onChange={e => { setForm({ ...form, lead_search: e.target.value }); searchLeads(e.target.value) }}
                    className={inp} />
                )}
                {leadResults.length > 0 && !form.lead_id && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1">
                    {leadResults.map(l => (
                      <button key={l.id} type="button"
                        onClick={() => { setForm({ ...form, lead_id: l.id, lead_search: l.name }); setLeadResults([]) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {l.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); setLeadResults([]) }}
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
