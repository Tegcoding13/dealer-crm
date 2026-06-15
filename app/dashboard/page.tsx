'use client'

import { useEffect, useState, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Lead = {
  id: string
  name: string
  phone: string | null
  owner: string | null
  value: number
  stage: string
  created_at: string
  activities?: { id: string }[]
}

type Task = {
  id: string
  title: string
  due_date: string | null
  assigned_to: string | null
  status: string
  lead_id: string | null
  leads?: { id: string; name: string } | null
}

type Activity = {
  id: string
  type: string
  text: string | null
  by: string | null
  ts: string
  leads?: { name: string } | { name: string }[] | null
}

const PERSON_COLORS = ['#e85d4a', '#4b9ef4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316']

function getColor(name: string, employees: string[]) {
  const idx = employees.indexOf(name)
  return PERSON_COLORS[idx >= 0 ? idx % PERSON_COLORS.length : 0]
}

function Avatar({ name, color, size = 'sm' }: { name: string; color: string; size?: 'sm' | 'md' }) {
  const sz = size === 'md' ? 'w-8 h-8 text-sm' : 'w-6 h-6 text-xs'
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`} style={{ background: color }}>
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const out: Record<string, T[]> = {}
  for (const item of items) {
    const k = key(item)
    if (!out[k]) out[k] = []
    out[k].push(item)
  }
  return out
}

function WorkSection({
  title, icon, items, personFilter, employeeList, router, emptyMsg, renderRow,
}: {
  title: string
  icon: string
  items: Record<string, { label: string; count: number; onClick: () => void; sub?: string }[]>
  personFilter: string
  employeeList: string[]
  router: ReturnType<typeof useRouter>
  emptyMsg: string
  renderRow: (person: string, rows: { label: string; count: number; onClick: () => void; sub?: string }[]) => React.ReactNode
}) {
  const people = Object.keys(items).filter(p => personFilter === 'all' || p === personFilter)
  const total = Object.values(items).flat().reduce((s, r) => s + r.count, 0)
  if (total === 0) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-gray-50/60">
        <span className="text-lg">{icon}</span>
        <h2 className="font-semibold text-gray-800 text-sm">{title}</h2>
        <span className="ml-auto text-xs font-semibold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">{total}</span>
      </div>
      <div className="divide-y divide-gray-50">
        {people.map(person => renderRow(person, items[person]))}
      </div>
    </div>
  )
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const personFilter = searchParams.get('person') || 'all'

  const [newLeads, setNewLeads] = useState<Lead[]>([])
  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [todayTasks, setTodayTasks] = useState<Task[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [employeeList, setEmployeeList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  const today = toDateStr(new Date())
  const nextWeek = toDateStr(new Date(Date.now() + 7 * 86400000))

  useEffect(() => {
    const load = async () => {
      const [
        { data: empData },
        { data: leadsData },
        { data: allLeadsData },
        { data: todayData },
        { data: upcomingData },
        { data: actData },
      ] = await Promise.all([
        supabase.from('org_members').select('full_name').not('full_name', 'is', null),
        supabase.from('leads').select('id, name, phone, owner, value, stage, created_at, activities(id)').eq('stage', 'new'),
        supabase.from('leads').select('id, name, phone, owner, value, stage, created_at'),
        supabase.from('tasks').select('*, leads(id, name)').eq('status', 'open').eq('due_date', today),
        supabase.from('tasks').select('*, leads(id, name)').eq('status', 'open').gt('due_date', today).lte('due_date', nextWeek),
        supabase.from('activities').select('id, type, text, by, ts, leads(name)').order('ts', { ascending: false }).limit(6),
      ])
      setEmployeeList((empData || []).map(r => r.full_name).filter(Boolean) as string[])
      setNewLeads((leadsData || []).filter(l => (l.activities?.length ?? 0) === 0))
      setAllLeads(allLeadsData || [])
      setTodayTasks(todayData || [])
      setUpcomingTasks(upcomingData || [])
      setActivities(actData || [])
      setLoading(false)
    }
    load()
  }, [])

  const stats = useMemo(() => {
    const active = allLeads.filter(l => !['closed-won', 'closed-lost'].includes(l.stage))
    const won = allLeads.filter(l => l.stage === 'closed-won')
    return {
      total: allLeads.length,
      pipeline: active.reduce((s, l) => s + l.value, 0),
      wonCount: won.length,
      wonValue: won.reduce((s, l) => s + l.value, 0),
      todayCount: todayTasks.length,
    }
  }, [allLeads, todayTasks])

  // Group needs-first-contact by owner
  const needsContact = useMemo(() => groupBy(newLeads, l => l.owner || 'Unassigned'), [newLeads])

  // Group today's tasks by assigned_to
  const todayByPerson = useMemo(() => groupBy(todayTasks, t => t.assigned_to || 'Unassigned'), [todayTasks])

  // Group upcoming tasks by assigned_to
  const upcomingByPerson = useMemo(() => groupBy(upcomingTasks, t => t.assigned_to || 'Unassigned'), [upcomingTasks])

  const setFilter = (person: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (person === 'all') params.delete('person')
    else params.set('person', person)
    router.push(`/dashboard?${params.toString()}`)
  }

  const renderPersonRow = (
    person: string,
    tasks: Task[],
    leadLookup?: Record<string, Lead>
  ) => {
    const color = getColor(person, employeeList)
    const first = tasks[0]
    const leadName = first?.leads ? (Array.isArray(first.leads) ? first.leads[0]?.name : first.leads?.name) : null
    const extra = tasks.length - 1

    const label = leadName
      ? extra > 0 ? `${leadName} and ${extra} more` : leadName
      : extra > 0 ? `${first?.title} and ${extra} more` : first?.title || '—'

    return (
      <div key={person} className="px-5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar name={person} color={color} />
          <span className="text-xs font-semibold" style={{ color }}>{person}</span>
        </div>
        <div className="flex items-center gap-3 ml-8">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
            {tasks.length}
          </span>
          <span className="flex-1 text-sm text-gray-700 truncate">{label}</span>
          <div className="flex gap-2 shrink-0">
            {first?.lead_id && (
              <button
                onClick={() => router.push(`/leads/${first.lead_id}`)}
                className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium"
              >
                View
              </button>
            )}
            {tasks.length > 1 && (
              <button
                onClick={() => router.push('/tasks')}
                className="text-xs px-3 py-1 rounded-lg text-white font-medium"
                style={{ background: color }}
              >
                All {tasks.length}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderLeadRow = (person: string, leads: Lead[]) => {
    const color = getColor(person, employeeList)
    const first = leads[0]
    const extra = leads.length - 1
    const label = extra > 0 ? `${first.name} and ${extra} more` : first.name

    return (
      <div key={person} className="px-5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Avatar name={person} color={color} />
          <span className="text-xs font-semibold" style={{ color }}>{person}</span>
        </div>
        <div className="flex items-center gap-3 ml-8">
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: color }}>
            {leads.length}
          </span>
          <span className="flex-1 text-sm text-gray-700 truncate">{label}</span>
          <div className="flex gap-2 shrink-0">
            <button onClick={() => router.push(`/leads/${first.id}`)} className="text-xs px-3 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">View</button>
            {leads.length > 1 && (
              <button onClick={() => router.push('/leads')} className="text-xs px-3 py-1 rounded-lg text-white font-medium" style={{ background: color }}>
                All {leads.length}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const filteredPeople = (groups: Record<string, unknown[]>) =>
    Object.keys(groups).filter(p => personFilter === 'all' || p === personFilter)

  const totalNeedsContact = Object.values(needsContact).flat().length
  const totalToday = Object.values(todayByPerson).flat().length
  const totalUpcoming = Object.values(upcomingByPerson).flat().length

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-400">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>

        {/* Person filter pills */}
        {employeeList.length > 0 && (
          <div className="flex gap-2 mb-5 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${personFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            {employeeList.map((name, i) => {
              const color = PERSON_COLORS[i % PERSON_COLORS.length]
              const active = personFilter === name
              return (
                <button
                  key={name}
                  onClick={() => setFilter(name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: active ? color : `${color}18`,
                    color: active ? '#fff' : color,
                  }}
                >
                  <Avatar name={name} color={color} size="sm" />
                  {name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex gap-5">
          {/* Left: work queue */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Needs First Contact */}
            {filteredPeople(needsContact).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-amber-50/60">
                  <span className="text-lg">🏷️</span>
                  <h2 className="font-semibold text-gray-800 text-sm">Needs First Contact</h2>
                  <span className="ml-auto text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{totalNeedsContact}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredPeople(needsContact).map(person => renderLeadRow(person, needsContact[person]))}
                </div>
              </div>
            )}

            {/* Today's Follow-ups */}
            {filteredPeople(todayByPerson).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-blue-50/60">
                  <span className="text-lg">⏰</span>
                  <h2 className="font-semibold text-gray-800 text-sm">Today&apos;s Follow-ups</h2>
                  <span className="ml-auto text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{totalToday}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredPeople(todayByPerson).map(person => renderPersonRow(person, todayByPerson[person]))}
                </div>
              </div>
            )}

            {/* Upcoming This Week */}
            {filteredPeople(upcomingByPerson).length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 bg-purple-50/60">
                  <span className="text-lg">📅</span>
                  <h2 className="font-semibold text-gray-800 text-sm">Upcoming This Week</h2>
                  <span className="ml-auto text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{totalUpcoming}</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {filteredPeople(upcomingByPerson).map(person => renderPersonRow(person, upcomingByPerson[person]))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {totalNeedsContact === 0 && totalToday === 0 && totalUpcoming === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
                <p className="text-3xl mb-3">✅</p>
                <p className="font-semibold text-gray-700">All caught up!</p>
                <p className="text-sm text-gray-400 mt-1">No pending follow-ups or new leads waiting for contact.</p>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="w-64 shrink-0 space-y-4">
            {/* Stats */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Stats</h3>
              {[
                { label: 'Total Leads', value: stats.total, color: 'text-gray-900' },
                { label: 'Pipeline Value', value: `$${stats.pipeline.toLocaleString()}`, color: 'text-blue-600' },
                { label: 'Tasks Due Today', value: stats.todayCount, color: stats.todayCount > 0 ? 'text-orange-500' : 'text-gray-900' },
                { label: 'Closed Won', value: `${stats.wonCount} · $${stats.wonValue.toLocaleString()}`, color: 'text-green-600' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className={`text-sm font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Team overview */}
            {employeeList.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Team</h3>
                <div className="space-y-2">
                  {employeeList.map((name, i) => {
                    const color = PERSON_COLORS[i % PERSON_COLORS.length]
                    const myToday = todayByPerson[name]?.length || 0
                    const myUpcoming = upcomingByPerson[name]?.length || 0
                    const myNew = needsContact[name]?.length || 0
                    return (
                      <button
                        key={name}
                        onClick={() => setFilter(personFilter === name ? 'all' : name)}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <Avatar name={name} color={color} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                          <p className="text-xs text-gray-400">{myToday} today · {myNew} new</p>
                        </div>
                        {(myToday + myUpcoming + myNew) > 0 && (
                          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
                            {myToday + myUpcoming + myNew}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recent activity */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent Activity</h3>
              {activities.length === 0 ? (
                <p className="text-xs text-gray-400">No recent activity</p>
              ) : (
                <ul className="space-y-2.5">
                  {activities.map(a => {
                    const leadName = a.leads ? (Array.isArray(a.leads) ? (a.leads[0] as {name:string})?.name : (a.leads as {name:string}).name) : null
                    return (
                      <li key={a.id} className="flex items-start gap-2">
                        <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${a.type === 'call' ? 'bg-blue-400' : a.type === 'note' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">{a.text || `${a.type} logged`}</p>
                          <p className="text-[10px] text-gray-400">{a.by}{leadName ? ` · ${leadName}` : ''}</p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex items-center justify-center h-64 text-gray-400">Loading…</div></AppLayout>}>
      <DashboardContent />
    </Suspense>
  )
}
