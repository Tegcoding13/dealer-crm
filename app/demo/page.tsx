'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts'

const LEADS = [
  { id: '1', name: 'Mike Thompson', company: 'Thompson Construction', phone: '(920) 555-0101', stage: 'proposal', value: 45000, owner: 'Tyler Egnarski', source: 'Referral', email: 'mike@thompsonco.com' },
  { id: '2', name: 'Sarah Johnson', company: null, phone: '(414) 555-0182', stage: 'qualified', value: 38500, owner: 'Tyler Egnarski', source: 'Website', email: 'sjohnson@gmail.com' },
  { id: '3', name: 'James Wilson', company: 'Wilson Farms LLC', phone: '(715) 555-0234', stage: 'new', value: 52000, owner: 'Tyler Egnarski', source: 'Walk-in', email: null },
  { id: '4', name: 'Lisa Martinez', company: null, phone: '(608) 555-0317', stage: 'contacted', value: 35000, owner: 'Tyler Egnarski', source: 'Referral', email: 'lisa.m@yahoo.com' },
  { id: '5', name: 'Robert Davis', company: 'Davis Logistics', phone: '(920) 555-0456', stage: 'closed-won', value: 58000, owner: 'Tyler Egnarski', source: 'Cold Call', email: 'rdavis@davislogistics.com' },
  { id: '6', name: 'Emma Brown', company: null, phone: '(262) 555-0521', stage: 'closed-lost', value: 32000, owner: 'Tyler Egnarski', source: 'Social Media', email: 'emma.brown@gmail.com' },
]

const ACTIVITIES = [
  { id: '1', type: 'call', text: 'Discussed F-150 Lariat package — very interested in moonroof and tow package. Following up Friday.', by: 'Tyler Egnarski', ts: '2026-06-14T14:30:00' },
  { id: '2', type: 'note', text: 'Customer pre-approved at $850/mo through local credit union. Has trade-in 2019 F-150 XLT.', by: 'Tyler Egnarski', ts: '2026-06-13T10:15:00' },
  { id: '3', type: 'stage', text: 'Stage changed from "qualified" to "proposal"', by: 'Tyler Egnarski', ts: '2026-06-12T09:00:00' },
  { id: '4', type: 'call', text: 'Left voicemail about weekend test drive availability.', by: 'Tyler Egnarski', ts: '2026-06-10T16:45:00' },
  { id: '5', type: 'created', text: 'Lead created', by: 'Tyler Egnarski', ts: '2026-06-08T08:00:00' },
]

const TASKS = [
  { id: '1', title: 'Send financing options PDF', status: 'done', due_date: '2026-06-13', assigned_to: 'Tyler Egnarski' },
  { id: '2', title: 'Schedule test drive for Saturday', status: 'open', due_date: '2026-06-17', assigned_to: 'Tyler Egnarski' },
  { id: '3', title: 'Follow up on trade-in appraisal', status: 'open', due_date: '2026-06-18', assigned_to: 'Tyler Egnarski' },
]

const STAGE_COLORS: Record<string, string> = {
  'new': 'bg-gray-100 text-gray-700',
  'contacted': 'bg-blue-100 text-blue-700',
  'qualified': 'bg-yellow-100 text-yellow-700',
  'proposal': 'bg-purple-100 text-purple-700',
  'closed-won': 'bg-green-100 text-green-700',
  'closed-lost': 'bg-red-100 text-red-700',
}

const ACTIVITY_ICONS: Record<string, { bg: string; color: string }> = {
  call: { bg: 'bg-blue-100', color: 'text-blue-600' },
  note: { bg: 'bg-yellow-100', color: 'text-yellow-600' },
  stage: { bg: 'bg-purple-100', color: 'text-purple-600' },
  created: { bg: 'bg-green-100', color: 'text-green-600' },
}

const byStage = [
  { stage: 'new', count: 1 },
  { stage: 'contacted', count: 1 },
  { stage: 'qualified', count: 1 },
  { stage: 'proposal', count: 1 },
  { stage: 'closed-won', count: 1 },
  { stage: 'closed-lost', count: 1 },
]

const wonVsLost = [
  { month: 'Mar', won: 2, lost: 1 },
  { month: 'Apr', won: 3, lost: 2 },
  { month: 'May', won: 4, lost: 1 },
  { month: 'Jun', won: 1, lost: 1 },
]

const PIE_COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ef4444']

type View = 'dashboard' | 'leads' | 'detail'

export default function DemoPage() {
  const [view, setView] = useState<View>('dashboard')
  const [selectedLead, setSelectedLead] = useState(LEADS[0])
  const NAV = [
    { label: 'Dashboard', view: 'dashboard' as View },
    { label: 'Leads', view: 'leads' as View },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-[#2d1b69] text-white text-sm py-2 px-4 flex items-center justify-between">
        <span className="font-medium">👋 You&apos;re viewing a demo of IronFlowCRM</span>
        <Link href="/" className="bg-white text-[#2d1b69] text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-100">
          Sign In →
        </Link>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="w-56 bg-[#2d1b69] flex flex-col shrink-0">
          <div className="px-4 py-5 border-b border-white/10">
            <Image src="/logo.png" alt="IronFlow CRM" width={160} height={55} className="object-contain w-full" priority />
          </div>
          <nav className="flex-1 px-3 py-4 space-y-1">
            {NAV.map(({ label, view: v }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium w-full text-left transition-colors ${
                  view === v || (view === 'detail' && v === 'leads')
                    ? 'bg-white/20 text-white'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {label === 'Dashboard' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
                {label}
              </button>
            ))}
          </nav>
          <div className="px-3 py-4 border-t border-white/10">
            <Link href="/" className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium bg-white/20 text-white hover:bg-white/30 transition-colors justify-center">
              Get Started Free →
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-gray-50 overflow-auto">

          {/* DASHBOARD */}
          {view === 'dashboard' && (
            <div className="p-6 space-y-6">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Leads', value: '6', color: 'text-gray-900' },
                  { label: 'Pipeline Value', value: '$170,500', color: 'text-blue-600', sub: 'active stages' },
                  { label: 'Closed Won', value: '1', color: 'text-green-600', sub: '$58,000' },
                  { label: 'Closed Lost', value: '1', color: 'text-red-500' },
                ].map(({ label, value, color, sub }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
                    <p className="text-sm text-gray-500 mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Deals by Pipeline Stage</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={byStage} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {byStage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Leads by Stage</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={byStage} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="count" paddingAngle={2}>
                        {byStage.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Won vs Lost (by month)</h2>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={wonVsLost}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} dot={false} name="Won" />
                      <Line type="monotone" dataKey="lost" stroke="#ef4444" strokeWidth={2} dot={false} name="Lost" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Activities</h2>
                  <ul className="space-y-3">
                    {ACTIVITIES.slice(0, 4).map(a => (
                      <li key={a.id} className="flex items-start gap-3 text-sm">
                        <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                          a.type === 'call' ? 'bg-blue-400' : a.type === 'note' ? 'bg-yellow-400' : a.type === 'stage' ? 'bg-purple-400' : 'bg-gray-300'
                        }`} />
                        <div>
                          <p className="text-gray-700">{a.text}</p>
                          <p className="text-gray-400 text-xs">{a.by} · {new Date(a.ts).toLocaleDateString()}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* LEADS */}
          {view === 'leads' && (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
                <span className="bg-gray-100 text-gray-500 text-sm px-4 py-2 rounded-lg cursor-not-allowed">+ Add Lead</span>
              </div>
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {LEADS.map(lead => (
                      <tr key={lead.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => { setSelectedLead(lead); setView('detail') }}>
                        <td className="px-4 py-3 font-medium text-gray-900">{lead.name}</td>
                        <td className="px-4 py-3 text-gray-500">{lead.company || '—'}</td>
                        <td className="px-4 py-3 text-gray-500">{lead.phone}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">${lead.value.toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-500">{lead.owner}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LEAD DETAIL */}
          {view === 'detail' && (
            <div className="p-6 max-w-6xl mx-auto space-y-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setView('leads')} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div>
                    <h1 className="text-xl font-semibold text-gray-900">{selectedLead.name}</h1>
                    {selectedLead.company && <p className="text-sm text-gray-500">{selectedLead.company}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg opacity-80 cursor-not-allowed">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    Call
                  </span>
                  <span className={`text-sm font-medium rounded-full px-3 py-1 ${STAGE_COLORS[selectedLead.stage]}`}>{selectedLead.stage}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                    <h2 className="text-sm font-semibold text-gray-700">Lead Info</h2>
                    <dl className="space-y-3 text-sm">
                      {[
                        { label: 'Phone', value: selectedLead.phone },
                        { label: 'Email', value: selectedLead.email },
                        { label: 'Owner', value: selectedLead.owner },
                        { label: 'Source', value: selectedLead.source },
                        { label: 'Value', value: `$${selectedLead.value.toLocaleString()}` },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="text-gray-400 shrink-0">{label}</dt>
                          <dd className="text-gray-700 text-right">{value || '—'}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-700">Tasks</h2>
                    <ul className="space-y-2 pt-1">
                      {TASKS.map(task => (
                        <li key={task.id} className="flex items-start gap-3">
                          <div className={`mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}>
                            {task.status === 'done' && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                          <div className={task.status === 'done' ? 'opacity-50' : ''}>
                            <p className={`text-sm ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-700'}`}>{task.title}</p>
                            <p className="text-xs text-gray-400">Due {new Date(task.due_date).toLocaleDateString()} · {task.assigned_to}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity</h2>
                  <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                    {ACTIVITIES.map(act => {
                      const meta = ACTIVITY_ICONS[act.type] || ACTIVITY_ICONS.note
                      return (
                        <li key={act.id} className="ml-5">
                          <span className={`absolute -left-3 flex items-center justify-center w-6 h-6 rounded-full ${meta.bg}`}>
                            <span className={`w-2 h-2 rounded-full ${meta.color.replace('text', 'bg')}`} />
                          </span>
                          <p className="text-sm text-gray-700">{act.text}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{act.by} · {new Date(act.ts).toLocaleString()}</p>
                        </li>
                      )
                    })}
                  </ol>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
