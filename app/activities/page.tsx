'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Activity = {
  id: string
  type: string
  text: string | null
  by: string | null
  ts: string
  lead_id: string | null
  leads?: { id: string; name: string } | null
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
  call: {
    bg: 'bg-blue-100', text: 'text-blue-700', label: 'Call',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>,
  },
  note: {
    bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Note',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  stage: {
    bg: 'bg-purple-100', text: 'text-purple-700', label: 'Stage',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>,
  },
  created: {
    bg: 'bg-green-100', text: 'text-green-700', label: 'Created',
    icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  },
}

export default function ActivitiesPage() {
  const router = useRouter()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => { fetchActivities() }, [typeFilter])

  const fetchActivities = async () => {
    setLoading(true)
    let query = supabase
      .from('activities')
      .select('*, leads(id, name)')
      .order('ts', { ascending: false })
      .limit(300)

    if (typeFilter !== 'all') query = query.eq('type', typeFilter)

    const { data } = await query
    setActivities(data || [])
    setLoading(false)
  }

  const grouped = activities.reduce((acc, act) => {
    const date = new Date(act.ts).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })
    if (!acc[date]) acc[date] = []
    acc[date].push(act)
    return acc
  }, {} as Record<string, Activity[]>)

  const counts = {
    call: activities.filter(a => a.type === 'call').length,
    note: activities.filter(a => a.type === 'note').length,
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-5 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Activities</h1>
            <p className="text-sm text-gray-400 mt-0.5">{counts.call} calls · {counts.note} notes</p>
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
            <option value="all">All types</option>
            <option value="call">Calls</option>
            <option value="note">Notes</option>
            <option value="stage">Stage changes</option>
          </select>
        </div>

        {loading ? (
          <div className="text-gray-400 py-10 text-center">Loading…</div>
        ) : activities.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No activities yet</div>
        ) : (
          Object.entries(grouped).map(([date, acts]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 pl-1">{date}</p>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {acts.map(act => {
                  const style = TYPE_STYLES[act.type] || TYPE_STYLES.note
                  const lead = Array.isArray(act.leads) ? act.leads[0] : act.leads
                  return (
                    <div key={act.id} className="flex items-start gap-3 px-4 py-3">
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                        {style.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800">{act.text || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {act.by && <span className="text-xs text-gray-400">{act.by}</span>}
                          {lead && (
                            <>
                              <span className="text-xs text-gray-300">·</span>
                              <button
                                onClick={() => router.push(`/leads/${lead.id}`)}
                                className="text-xs text-blue-600 hover:underline"
                              >
                                {lead.name}
                              </button>
                            </>
                          )}
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">
                            {new Date(act.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </AppLayout>
  )
}
