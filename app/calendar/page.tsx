'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Task = {
  id: string
  title: string
  due_date: string | null
  assigned_to: string | null
  status: string
  lead_id: string | null
  leads?: { id: string; name: string } | null
}

type View = 'monthly' | 'weekly' | 'daily'

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function addDays(date: Date, n: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function startOfWeek(date: Date) {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function formatDisplay(dateStr: string, long = false) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', long
    ? { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
    : { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function CalendarPage() {
  const router = useRouter()
  const today = new Date()
  const todayStr = toStr(today)

  const [view, setView] = useState<View>('monthly')
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState<string>(todayStr)
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('tasks')
        .select('*, leads(id, name)')
        .order('due_date', { ascending: true })
      setTasks(data || [])
      setLoading(false)
    }
    fetch()
  }, [])

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {}
    for (const t of tasks) {
      if (t.due_date) {
        const key = t.due_date.slice(0, 10)
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    }
    return map
  }, [tasks])

  // Navigation
  const navigate = (dir: 1 | -1) => {
    if (view === 'monthly') {
      setCursor(c => new Date(c.getFullYear(), c.getMonth() + dir, 1))
    } else if (view === 'weekly') {
      setCursor(c => addDays(c, dir * 7))
    } else {
      setCursor(c => addDays(c, dir))
    }
  }

  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1))

  // Title
  const navTitle = useMemo(() => {
    if (view === 'monthly') return `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`
    if (view === 'weekly') {
      const ws = startOfWeek(cursor)
      const we = addDays(ws, 6)
      return `${ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${we.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    }
    return formatDisplay(toStr(cursor), true)
  }, [view, cursor])

  // Monthly grid days
  const monthDays = useMemo(() => {
    const firstDay = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay()
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [cursor])

  // Weekly days
  const weekDays = useMemo(() => {
    const ws = startOfWeek(view === 'weekly' ? cursor : today)
    return Array.from({ length: 7 }, (_, i) => toStr(addDays(ws, i)))
  }, [view, cursor])

  const overdue = useMemo(() => tasks.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr && t.status !== 'done'), [tasks, todayStr])
  const upcoming = useMemo(() => tasks.filter(t => t.due_date && t.due_date.slice(0, 10) >= todayStr && t.status !== 'done').slice(0, 10), [tasks, todayStr])
  const unscheduled = useMemo(() => tasks.filter(t => !t.due_date && t.status !== 'done'), [tasks])

  const selectedTasks = tasksByDate[selectedDay] || []

  const TaskPill = ({ t, compact = false }: { t: Task; compact?: boolean }) => (
    <div
      onClick={e => { e.stopPropagation(); if (t.lead_id) router.push(`/leads/${t.lead_id}`) }}
      className={`group flex items-start gap-1.5 rounded-md px-2 py-1 cursor-pointer transition-colors ${
        t.status === 'done' ? 'bg-green-50 hover:bg-green-100' : 'bg-orange-50 hover:bg-orange-100'
      } ${compact ? 'text-[11px]' : 'text-xs'}`}
    >
      <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${t.status === 'done' ? 'bg-green-500' : 'bg-orange-400'}`} />
      <div className="min-w-0">
        <p className={`font-medium truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
        {!compact && t.leads && <p className="text-gray-400 truncate">{t.leads.name}</p>}
      </div>
    </div>
  )

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-semibold text-gray-900">Calendar</h1>

          {/* View toggle */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => { setView(v); setCursor(v === 'monthly' ? new Date(today.getFullYear(), today.getMonth(), 1) : new Date(today)) }}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-5">
          {/* Main calendar area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Nav bar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button onClick={() => navigate(1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <span className="font-semibold text-gray-900 text-sm">{navTitle}</span>
                </div>
                <button onClick={goToday} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium">
                  Today
                </button>
              </div>

              {/* ── MONTHLY VIEW ── */}
              {view === 'monthly' && (
                <>
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {DAYS_SHORT.map(d => (
                      <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {monthDays.map((dateStr, i) => {
                      if (!dateStr) return <div key={`e-${i}`} className="border-b border-r border-gray-50 min-h-[100px] bg-gray-50/50" />
                      const dayTasks = tasksByDate[dateStr] || []
                      const isToday = dateStr === todayStr
                      const isSelected = dateStr === selectedDay
                      const open = dayTasks.filter(t => t.status !== 'done')
                      const done = dayTasks.filter(t => t.status === 'done')
                      const dayNum = parseInt(dateStr.split('-')[2])
                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedDay(dateStr)}
                          className={`border-b border-r border-gray-100 min-h-[100px] p-1.5 cursor-pointer transition-colors ${isSelected ? 'bg-green-50 ring-1 ring-inset ring-green-300' : 'hover:bg-gray-50'}`}
                        >
                          <div className={`w-6 h-6 flex items-center justify-center text-xs font-semibold rounded-full mb-1 ${isToday ? 'bg-[#367C2B] text-white' : 'text-gray-700'}`}>
                            {dayNum}
                          </div>
                          <div className="space-y-0.5">
                            {open.slice(0, 2).map(t => <TaskPill key={t.id} t={t} compact />)}
                            {open.length > 2 && <p className="text-[10px] text-orange-500 font-medium px-1">+{open.length - 2} more</p>}
                            {done.length > 0 && open.length === 0 && <TaskPill key={done[0].id} t={done[0]} compact />}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* ── WEEKLY VIEW ── */}
              {view === 'weekly' && (
                <>
                  <div className="grid grid-cols-7 border-b border-gray-100">
                    {weekDays.map((dateStr, i) => {
                      const isToday = dateStr === todayStr
                      const dayNum = parseInt(dateStr.split('-')[2])
                      return (
                        <div key={dateStr} className={`text-center py-3 px-1 ${isToday ? 'bg-green-50' : ''}`}>
                          <p className="text-xs text-gray-400 font-medium">{DAYS_SHORT[i]}</p>
                          <p className={`text-lg font-semibold mt-0.5 ${isToday ? 'text-[#367C2B]' : 'text-gray-800'}`}>{dayNum}</p>
                        </div>
                      )
                    })}
                  </div>
                  <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-[400px]">
                    {weekDays.map(dateStr => {
                      const dayTasks = tasksByDate[dateStr] || []
                      const isToday = dateStr === todayStr
                      return (
                        <div
                          key={dateStr}
                          onClick={() => setSelectedDay(dateStr)}
                          className={`p-2 space-y-1 cursor-pointer transition-colors ${isToday ? 'bg-green-50/50' : 'hover:bg-gray-50'} ${selectedDay === dateStr ? 'ring-1 ring-inset ring-green-300' : ''}`}
                        >
                          {dayTasks.length === 0
                            ? <p className="text-[11px] text-gray-300 text-center mt-4">—</p>
                            : dayTasks.map(t => <TaskPill key={t.id} t={t} />)
                          }
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* ── DAILY VIEW ── */}
              {view === 'daily' && (
                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">{DAYS_FULL[cursor.getDay()]}</p>
                      <p className="text-2xl font-bold text-gray-900">{cursor.getDate()} {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
                    </div>
                    {toStr(cursor) === todayStr && (
                      <span className="text-xs font-semibold bg-[#367C2B] text-white px-3 py-1 rounded-full">Today</span>
                    )}
                  </div>
                  {(() => {
                    const dayTasks = tasksByDate[toStr(cursor)] || []
                    const open = dayTasks.filter(t => t.status !== 'done')
                    const done = dayTasks.filter(t => t.status === 'done')
                    if (dayTasks.length === 0) return <p className="text-gray-400 text-sm py-8 text-center">No tasks scheduled for this day</p>
                    return (
                      <div className="space-y-4">
                        {open.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Open ({open.length})</p>
                            <div className="space-y-2">
                              {open.map(t => (
                                <div
                                  key={t.id}
                                  onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                                  className={`flex items-start gap-3 p-3 rounded-lg border border-orange-100 bg-orange-50 ${t.lead_id ? 'cursor-pointer hover:bg-orange-100' : ''}`}
                                >
                                  <span className="mt-1 w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                                  <div>
                                    <p className="font-medium text-gray-800 text-sm">{t.title}</p>
                                    {t.leads && <p className="text-xs text-gray-500 mt-0.5">{t.leads.name}</p>}
                                    {t.assigned_to && <p className="text-xs text-gray-400">Assigned to {t.assigned_to}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {done.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completed ({done.length})</p>
                            <div className="space-y-2">
                              {done.map(t => (
                                <div
                                  key={t.id}
                                  onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                                  className={`flex items-start gap-3 p-3 rounded-lg border border-green-100 bg-green-50 ${t.lead_id ? 'cursor-pointer hover:bg-green-100' : ''}`}
                                >
                                  <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  <div>
                                    <p className="font-medium text-gray-400 text-sm line-through">{t.title}</p>
                                    {t.leads && <p className="text-xs text-gray-400 mt-0.5">{t.leads.name}</p>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Right panel — always visible */}
          <div className="w-64 shrink-0 space-y-4">
            {/* Selected day (monthly/weekly) */}
            {view !== 'daily' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-sm font-semibold text-gray-800">{formatDisplay(selectedDay)}</p>
                </div>
                {loading ? (
                  <p className="text-sm text-gray-400 px-4 py-3">Loading…</p>
                ) : selectedTasks.length === 0 ? (
                  <p className="text-sm text-gray-400 px-4 py-3">No tasks</p>
                ) : (
                  <ul className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                    {selectedTasks.map(t => (
                      <li key={t.id} onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                        className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                        <div className="flex items-start gap-2">
                          <span className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${t.status === 'done' ? 'bg-green-500' : 'bg-orange-400'}`} />
                          <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                            {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                  <p className="text-sm font-semibold text-red-700">Overdue ({overdue.length})</p>
                </div>
                <ul className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                  {overdue.map(t => (
                    <li key={t.id} onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-red-500">{t.due_date ? formatDisplay(t.due_date.slice(0, 10)) : ''}</p>
                      {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">Upcoming</p>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-3">No upcoming tasks</p>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                  {upcoming.map(t => (
                    <li key={t.id} onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                        {t.due_date?.slice(0, 10) === todayStr && (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded shrink-0 ml-1">Today</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{t.due_date ? formatDisplay(t.due_date.slice(0, 10)) : ''}</p>
                      {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Unscheduled */}
            {unscheduled.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-amber-50">
                  <p className="text-sm font-semibold text-amber-800">Unscheduled ({unscheduled.length})</p>
                </div>
                <ul className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {unscheduled.map(t => (
                    <li key={t.id} onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}>
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      {t.assigned_to && <p className="text-xs text-gray-400">{t.assigned_to}</p>}
                      {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
