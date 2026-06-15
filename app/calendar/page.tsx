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

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function toLocalDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function CalendarPage() {
  const router = useRouter()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDay, setSelectedDay] = useState<string | null>(toLocalDateStr(today))
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

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const days: (string | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
    }
    while (days.length % 7 !== 0) days.push(null)
    return days
  }, [year, month])

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const todayStr = toLocalDateStr(today)
  const selectedTasks = selectedDay ? (tasksByDate[selectedDay] || []) : []

  const upcoming = useMemo(() => {
    return tasks
      .filter(t => t.due_date && t.due_date.slice(0, 10) >= todayStr && t.status !== 'done')
      .slice(0, 10)
  }, [tasks, todayStr])

  const overdue = useMemo(() => {
    return tasks.filter(t => t.due_date && t.due_date.slice(0, 10) < todayStr && t.status !== 'done')
  }, [tasks, todayStr])

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-').map(Number)
    return new Date(y, m - 1, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">Calendar</h1>

        <div className="flex gap-6">
          {/* Calendar grid */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Month nav */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <span className="font-semibold text-gray-900">{MONTHS[month]} {year}</span>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-gray-100">
                {DAYS.map(d => (
                  <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((dateStr, i) => {
                  if (!dateStr) return <div key={`empty-${i}`} className="border-b border-r border-gray-50 min-h-[90px]" />
                  const dayTasks = tasksByDate[dateStr] || []
                  const isToday = dateStr === todayStr
                  const isSelected = dateStr === selectedDay
                  const openCount = dayTasks.filter(t => t.status !== 'done').length
                  const doneCount = dayTasks.filter(t => t.status === 'done').length
                  const dayNum = parseInt(dateStr.split('-')[2])

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDay(dateStr)}
                      className={`border-b border-r border-gray-100 min-h-[90px] p-1.5 cursor-pointer transition-colors ${
                        isSelected ? 'bg-green-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium rounded-full mb-1 ${
                        isToday ? 'bg-[#367C2B] text-white' : isSelected ? 'text-[#367C2B] font-bold' : 'text-gray-700'
                      }`}>
                        {dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {openCount > 0 && (
                          <div className="text-[10px] font-medium px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded truncate">
                            {openCount} open
                          </div>
                        )}
                        {doneCount > 0 && (
                          <div className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded truncate">
                            {doneCount} done
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-72 shrink-0 space-y-4">
            {/* Selected day tasks */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">
                  {selectedDay ? formatDate(selectedDay) : 'Select a day'}
                </p>
              </div>
              {loading ? (
                <p className="text-sm text-gray-400 px-4 py-4">Loading…</p>
              ) : selectedTasks.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-4">No tasks this day</p>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {selectedTasks.map(t => (
                    <li
                      key={t.id}
                      onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-3 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${t.status === 'done' ? 'bg-green-500' : 'bg-orange-400'}`} />
                        <div className="min-w-0">
                          <p className={`text-sm font-medium truncate ${t.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                          {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                          {t.assigned_to && <p className="text-xs text-gray-400">{t.assigned_to}</p>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                  <p className="text-sm font-semibold text-red-700">Overdue ({overdue.length})</p>
                </div>
                <ul className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                  {overdue.map(t => (
                    <li
                      key={t.id}
                      onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      <p className="text-xs text-red-500">{t.due_date ? formatDate(t.due_date.slice(0, 10)) : ''}</p>
                      {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Upcoming */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <p className="text-sm font-semibold text-gray-800">Upcoming Tasks</p>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-4">No upcoming tasks</p>
              ) : (
                <ul className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
                  {upcoming.map(t => (
                    <li
                      key={t.id}
                      onClick={() => t.lead_id && router.push(`/leads/${t.lead_id}`)}
                      className={`px-4 py-2.5 ${t.lead_id ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">{t.title}</p>
                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-400">{t.due_date ? formatDate(t.due_date.slice(0, 10)) : ''}</p>
                        {t.due_date && t.due_date.slice(0, 10) === todayStr && (
                          <span className="text-[10px] font-semibold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Today</span>
                        )}
                      </div>
                      {t.leads && <p className="text-xs text-gray-400 truncate">{t.leads.name}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
