'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

type Lead = {
  id: string
  stage: string
  value: number
  created_at: string
}

type Activity = {
  id: string
  type: string
  text: string
  by: string
  ts: string
  leads?: { name: string } | { name: string }[]
}

const STAGE_ORDER = ['new', 'contacted', 'qualified', 'proposal', 'closed-won', 'closed-lost']
const STAGE_COLORS: Record<string, string> = {
  'new': '#6b7280',
  'contacted': '#3b82f6',
  'qualified': '#f59e0b',
  'proposal': '#8b5cf6',
  'closed-won': '#10b981',
  'closed-lost': '#ef4444',
}
const PIE_COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function DashboardPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [{ data: leadsData }, { data: actData }] = await Promise.all([
        supabase.from('leads').select('id, stage, value, created_at'),
        supabase.from('activities').select('id, type, text, by, ts, leads(name)').order('ts', { ascending: false }).limit(8),
      ])
      setLeads(leadsData || [])
      setActivities(actData || [])
      setLoading(false)
    }
    load()
  }, [])

  const totalLeads = leads.length
  const pipelineValue = leads.filter(l => !['closed-won', 'closed-lost'].includes(l.stage)).reduce((s, l) => s + l.value, 0)
  const wonValue = leads.filter(l => l.stage === 'closed-won').reduce((s, l) => s + l.value, 0)
  const wonCount = leads.filter(l => l.stage === 'closed-won').length
  const lostCount = leads.filter(l => l.stage === 'closed-lost').length

  const byStage = STAGE_ORDER.map(stage => ({
    stage,
    count: leads.filter(l => l.stage === stage).length,
    value: leads.filter(l => l.stage === stage).reduce((s, l) => s + l.value, 0),
  }))

  const byMonth = (() => {
    const map: Record<string, { month: string; won: number; lost: number }> = {}
    leads.forEach(l => {
      const month = new Date(l.created_at).toLocaleString('default', { month: 'short', year: '2-digit' })
      if (!map[month]) map[month] = { month, won: 0, lost: 0 }
      if (l.stage === 'closed-won') map[month].won++
      if (l.stage === 'closed-lost') map[month].lost++
    })
    return Object.values(map).slice(-6)
  })()

  const pieData = byStage.filter(s => s.count > 0).map(s => ({ name: s.stage, value: s.count }))

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Leads" value={totalLeads} color="text-gray-900" />
          <StatCard label="Pipeline Value" value={`$${pipelineValue.toLocaleString()}`} color="text-blue-600" sub="active stages" />
          <StatCard label="Closed Won" value={wonCount} sub={`$${wonValue.toLocaleString()}`} color="text-green-600" />
          <StatCard label="Closed Lost" value={lostCount} color="text-red-500" />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline by stage */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Deals by Pipeline Stage</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byStage} layout="vertical" margin={{ left: 10, right: 20 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {byStage.map((entry) => (
                    <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads by Stage</h2>
            {pieData.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Won vs Lost trend + Recent activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Won vs Lost (by month)</h2>
            {byMonth.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No closed deals yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={byMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} dot={false} name="Won" />
                  <Line type="monotone" dataKey="lost" stroke="#ef4444" strokeWidth={2} dot={false} name="Lost" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activities</h2>
            {activities.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No activities yet</div>
            ) : (
              <ul className="space-y-3">
                {activities.map(a => (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      a.type === 'call' ? 'bg-blue-400' :
                      a.type === 'note' ? 'bg-yellow-400' :
                      a.type === 'stage' ? 'bg-purple-400' : 'bg-gray-300'
                    }`} />
                    <div>
                      <p className="text-gray-700">{a.text || `${a.type} activity`}</p>
                      <p className="text-gray-400 text-xs">{a.by} · {new Date(a.ts).toLocaleDateString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
