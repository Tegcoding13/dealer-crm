'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '../../components/AppLayout'

type Lead = {
  id: string
  name: string
  company: string | null
  type: string
  phone: string | null
  email: string | null
  category: string | null
  source: string | null
  owner: string | null
  stage: string
  value: number
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type Activity = {
  id: string
  type: string
  text: string | null
  by: string | null
  ts: string
}

type Task = {
  id: string
  title: string
  description: string | null
  due_date: string | null
  assigned_to: string | null
  status: string
}

const STAGES = ['new', 'contacted', 'qualified', 'proposal', 'closed-won', 'closed-lost']

const STAGE_COLORS: Record<string, string> = {
  'new': 'bg-gray-100 text-gray-700',
  'contacted': 'bg-blue-100 text-blue-700',
  'qualified': 'bg-yellow-100 text-yellow-700',
  'proposal': 'bg-purple-100 text-purple-700',
  'closed-won': 'bg-green-100 text-green-700',
  'closed-lost': 'bg-red-100 text-red-700',
}

const ACTIVITY_ICONS: Record<string, { bg: string; icon: React.ReactNode }> = {
  call: {
    bg: 'bg-blue-100',
    icon: <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  },
  note: {
    bg: 'bg-yellow-100',
    icon: <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  stage: {
    bg: 'bg-purple-100',
    icon: <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>,
  },
  created: {
    bg: 'bg-green-100',
    icon: <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  },
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Lead>>({})
  const [actInput, setActInput] = useState('')
  const [actType, setActType] = useState<'call' | 'note'>('note')
  const [actBy, setActBy] = useState('')
  const [taskInput, setTaskInput] = useState('')
  const [taskDue, setTaskDue] = useState('')
  const [taskAssigned, setTaskAssigned] = useState('')
  const [savingAct, setSavingAct] = useState(false)
  const [savingTask, setSavingTask] = useState(false)
  const [calling, setCalling] = useState(false)
  const [callStatus, setCallStatus] = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (id) load()
  }, [id])

  const load = async () => {
    setLoading(true)
    const [{ data: leadData }, { data: actData }, { data: taskData }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', id).single(),
      supabase.from('activities').select('*').eq('lead_id', id).order('ts', { ascending: false }),
      supabase.from('tasks').select('*').eq('lead_id', id).order('created_at', { ascending: false }),
    ])
    if (leadData) {
      setLead(leadData)
      setEditForm(leadData)
    }
    setActivities(actData || [])
    setTasks(taskData || [])
    setLoading(false)
  }

  const saveEdit = async () => {
    if (!lead) return
    const { error } = await supabase
      .from('leads')
      .update({ ...editForm, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    if (!error) {
      setLead({ ...lead, ...editForm } as Lead)
      setEditing(false)
    }
  }

  const changeStage = async (newStage: string) => {
    if (!lead || newStage === lead.stage) return
    const { error } = await supabase
      .from('leads')
      .update({ stage: newStage, updated_at: new Date().toISOString() })
      .eq('id', lead.id)
    if (!error) {
      await supabase.from('activities').insert({
        lead_id: lead.id,
        type: 'stage',
        text: `Stage changed from "${lead.stage}" to "${newStage}"`,
        by: lead.owner || 'system',
        ts: new Date().toISOString(),
      })
      setLead({ ...lead, stage: newStage })
      load()
    }
  }

  const logActivity = async () => {
    if (!actInput.trim() || !lead) return
    setSavingAct(true)
    await supabase.from('activities').insert({
      lead_id: lead.id,
      type: actType,
      text: actInput.trim(),
      by: actBy.trim() || 'me',
      ts: new Date().toISOString(),
    })
    setActInput('')
    setActBy('')
    setSavingAct(false)
    load()
  }

  const addTask = async () => {
    if (!taskInput.trim() || !lead) return
    setSavingTask(true)
    await supabase.from('tasks').insert({
      lead_id: lead.id,
      title: taskInput.trim(),
      due_date: taskDue || null,
      assigned_to: taskAssigned.trim() || null,
      status: 'open',
    })
    setTaskInput('')
    setTaskDue('')
    setTaskAssigned('')
    setSavingTask(false)
    load()
  }

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ status: task.status === 'open' ? 'done' : 'open' }).eq('id', task.id)
    load()
  }

  const initiateCall = async () => {
    if (!lead?.phone) {
      setCallStatus('No phone number on this lead.')
      return
    }
    setCalling(true)
    setCallStatus('')
    try {
      const res = await fetch('/api/twilio/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadPhone: lead.phone, leadName: lead.name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCallStatus(`Error: ${data.error}`)
      } else {
        setCallStatus('Calling your phone now — pick up to connect to the lead.')
        await supabase.from('activities').insert({
          lead_id: lead.id,
          type: 'call',
          text: `Outbound call initiated to ${lead.phone}`,
          by: lead.owner || 'me',
          ts: new Date().toISOString(),
        })
        load()
      }
    } catch {
      setCallStatus('Failed to initiate call. Check your connection.')
    }
    setCalling(false)
  }

  const deleteLead = async () => {
    if (!lead) return
    setDeleting(true)
    await supabase.from('tasks').delete().eq('lead_id', lead.id)
    await supabase.from('activities').delete().eq('lead_id', lead.id)
    await supabase.from('leads').delete().eq('id', lead.id)
    router.push('/leads')
  }

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    </AppLayout>
  )

  if (!lead) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Lead not found.</div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/leads')} className="text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{lead.name}</h1>
              {lead.company && <p className="text-sm text-gray-500">{lead.company}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Call button */}
            <button
              onClick={initiateCall}
              disabled={calling || !lead.phone}
              title={lead.phone ? `Call ${lead.phone}` : 'No phone number'}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              {calling ? 'Calling…' : 'Call'}
            </button>

            {/* Stage selector */}
            <select
              value={lead.stage}
              onChange={e => changeStage(e.target.value)}
              className={`text-sm font-medium rounded-full px-3 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${STAGE_COLORS[lead.stage]}`}
            >
              {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={() => editing ? saveEdit() : setEditing(true)}
              className={`text-sm px-4 py-2 rounded-lg font-medium ${editing ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {editing ? 'Save' : 'Edit'}
            </button>
            {editing && (
              <button onClick={() => { setEditing(false); setEditForm(lead) }} className="text-sm px-4 py-2 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">
                Cancel
              </button>
            )}
            <button
              onClick={() => setShowDelete(true)}
              className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete lead"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
          </div>
        </div>

        {/* Delete confirmation modal */}
        {showDelete && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900">Delete lead?</h2>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently delete <span className="font-medium text-gray-800">{lead.name}</span> and all their tasks and activity history. This cannot be undone.
              </p>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={deleteLead}
                  disabled={deleting}
                  className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setShowDelete(false)}
                  className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {callStatus && (
          <div className={`text-sm px-4 py-3 rounded-lg ${callStatus.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
            {callStatus}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column: info + tasks */}
          <div className="space-y-4">

            {/* Lead info card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Lead Info</h2>

              {editing ? (
                <div className="space-y-3">
                  {[
                    { label: 'Name', key: 'name', type: 'text' },
                    { label: 'Company', key: 'company', type: 'text' },
                    { label: 'Phone', key: 'phone', type: 'tel' },
                    { label: 'Email', key: 'email', type: 'email' },
                    { label: 'Address', key: 'address', type: 'text' },
                    { label: 'Owner', key: 'owner', type: 'text' },
                    { label: 'Source', key: 'source', type: 'text' },
                    { label: 'Value ($)', key: 'value', type: 'number' },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type={type}
                        value={(editForm as Record<string, string | number | null>)[key] ?? ''}
                        onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={editForm.notes ?? ''}
                      onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              ) : (
                <dl className="space-y-3 text-sm">
                  {[
                    { label: 'Phone', value: lead.phone },
                    { label: 'Email', value: lead.email },
                    { label: 'Address', value: lead.address },
                    { label: 'Owner', value: lead.owner },
                    { label: 'Source', value: lead.source },
                    { label: 'Value', value: lead.value ? `$${lead.value.toLocaleString()}` : null },
                    { label: 'Created', value: new Date(lead.created_at).toLocaleDateString() },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-gray-400 shrink-0">{label}</dt>
                      <dd className="text-gray-700 text-right">{value || '—'}</dd>
                    </div>
                  ))}
                  {lead.notes && (
                    <div className="pt-2 border-t border-gray-100">
                      <dt className="text-gray-400 mb-1">Notes</dt>
                      <dd className="text-gray-700 whitespace-pre-wrap">{lead.notes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </div>

            {/* Tasks */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Tasks</h2>

              <div className="space-y-2">
                <input
                  placeholder="New task…"
                  value={taskInput}
                  onChange={e => setTaskInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addTask()}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  placeholder="Assign to"
                  value={taskAssigned}
                  onChange={e => setTaskAssigned(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="w-full">
                  <label className="block text-xs text-gray-400 mb-1 ml-1">Due date</label>
                  <input
                    type="date"
                    value={taskDue}
                    onChange={e => setTaskDue(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={addTask}
                  disabled={savingTask || !taskInput.trim()}
                  className="w-full bg-gray-100 text-gray-700 rounded-lg py-1.5 text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                >
                  Add task
                </button>
              </div>

              {tasks.length === 0 ? (
                <p className="text-sm text-gray-400">No tasks yet</p>
              ) : (
                <ul className="space-y-2 pt-1 border-t border-gray-100">
                  {tasks.map(task => (
                    <li key={task.id} className="flex items-start gap-3 pt-2">
                      <button
                        onClick={() => toggleTask(task)}
                        className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          task.status === 'done'
                            ? 'bg-green-500 border-green-500'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {task.status === 'done' && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</p>
                        {(task.due_date || task.assigned_to) && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            {task.due_date && `Due ${new Date(task.due_date).toLocaleDateString()}`}
                            {task.due_date && task.assigned_to && ' · '}
                            {task.assigned_to}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right column: activity */}
          <div className="lg:col-span-2 space-y-4">

            {/* Log activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setActType('note')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${actType === 'note' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Note
                </button>
                <button
                  onClick={() => setActType('call')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${actType === 'call' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                  Call
                </button>
              </div>

              <textarea
                rows={3}
                placeholder={actType === 'call' ? 'What was discussed on the call?' : 'Add a note…'}
                value={actInput}
                onChange={e => setActInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <input
                  placeholder="Your name"
                  value={actBy}
                  onChange={e => setActBy(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={logActivity}
                  disabled={savingAct || !actInput.trim()}
                  className="px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingAct ? 'Saving…' : 'Log'}
                </button>
              </div>
            </div>

            {/* Activity timeline */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400">No activity yet</p>
              ) : (
                <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                  {activities.map(act => {
                    const meta = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.note
                    return (
                      <li key={act.id} className="ml-5">
                        <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${meta.bg}`}>
                          {meta.icon}
                        </span>
                        <div>
                          <p className="text-sm text-gray-700">{act.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {act.by && `${act.by} · `}
                            {new Date(act.ts).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
