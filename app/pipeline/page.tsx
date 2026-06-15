'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Lead = {
  id: string
  name: string
  company: string | null
  phone: string | null
  value: number
  stage: string
  owner: string | null
}

const COLUMNS = [
  { key: 'new',         label: 'New',       header: 'bg-gray-200 text-gray-700',   body: 'bg-gray-50' },
  { key: 'contacted',   label: 'Contacted', header: 'bg-blue-100 text-blue-700',   body: 'bg-blue-50/40' },
  { key: 'qualified',   label: 'Qualified', header: 'bg-yellow-100 text-yellow-700', body: 'bg-yellow-50/40' },
  { key: 'proposal',    label: 'Proposal',  header: 'bg-purple-100 text-purple-700', body: 'bg-purple-50/40' },
  { key: 'closed-won',  label: 'Won',       header: 'bg-green-100 text-green-700', body: 'bg-green-50/40' },
  { key: 'closed-lost', label: 'Lost',      header: 'bg-red-100 text-red-700',     body: 'bg-red-50/40' },
]

export default function PipelinePage() {
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  useEffect(() => { fetchLeads() }, [])

  const fetchLeads = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('leads')
      .select('id, name, company, phone, value, stage, owner')
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  const handleDrop = async (targetStage: string) => {
    setDragOver(null)
    if (!draggingId) return
    const lead = leads.find(l => l.id === draggingId)
    if (!lead || lead.stage === targetStage) { setDraggingId(null); return }

    const prevStage = lead.stage

    // Optimistic update
    setLeads(prev => prev.map(l => l.id === draggingId ? { ...l, stage: targetStage } : l))
    setDraggingId(null)

    await supabase.from('leads').update({ stage: targetStage, updated_at: new Date().toISOString() }).eq('id', draggingId)
    await supabase.from('activities').insert({
      lead_id: draggingId,
      type: 'stage',
      text: `Stage changed from "${prevStage}" to "${targetStage}"`,
      by: lead.owner || 'system',
      ts: new Date().toISOString(),
    })
  }

  const totalValue = leads.filter(l => l.stage !== 'closed-lost').reduce((s, l) => s + (l.value || 0), 0)

  if (loading) return (
    <AppLayout>
      <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>
    </AppLayout>
  )

  return (
    <AppLayout>
      <div className="p-6 flex flex-col h-full">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Pipeline</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {leads.length} leads · ${totalValue.toLocaleString()} active pipeline
            </p>
          </div>
          <p className="text-xs text-gray-400 italic">Drag cards to change stage</p>
        </div>

        {/* Board */}
        <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
          {COLUMNS.map(col => {
            const colLeads = leads.filter(l => l.stage === col.key)
            const colTotal = colLeads.reduce((s, l) => s + (l.value || 0), 0)
            const isOver = dragOver === col.key

            return (
              <div
                key={col.key}
                className={`flex-shrink-0 w-60 flex flex-col rounded-xl overflow-hidden border transition-all ${
                  isOver ? 'border-blue-400 shadow-lg shadow-blue-100 scale-[1.01]' : 'border-gray-200'
                }`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
                onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null) }}
                onDrop={() => handleDrop(col.key)}
              >
                {/* Column header */}
                <div className={`px-3 py-2.5 ${col.header}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{col.label}</span>
                    <span className="text-xs font-medium bg-white/60 px-1.5 py-0.5 rounded-full">{colLeads.length}</span>
                  </div>
                  {colTotal > 0 && (
                    <p className="text-xs opacity-70 mt-0.5">${colTotal.toLocaleString()}</p>
                  )}
                </div>

                {/* Cards */}
                <div className={`flex-1 p-2 space-y-2 min-h-48 ${col.body} ${isOver ? 'bg-blue-50' : ''}`}>
                  {colLeads.map(lead => (
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; setDraggingId(lead.id) }}
                      onDragEnd={() => { setDraggingId(null); setDragOver(null) }}
                      onClick={() => !draggingId && router.push(`/leads/${lead.id}`)}
                      className={`bg-white rounded-lg p-3 border border-gray-200 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md hover:border-gray-300 transition-all select-none group ${
                        draggingId === lead.id ? 'opacity-40 rotate-1' : ''
                      }`}
                    >
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {lead.name}
                      </p>
                      {lead.company && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{lead.company}</p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        {lead.value > 0 ? (
                          <span className="text-xs font-bold text-green-700">${lead.value.toLocaleString()}</span>
                        ) : <span />}
                        {lead.phone && (
                          <span className="text-xs text-gray-400">{lead.phone}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {colLeads.length === 0 && (
                    <div className={`flex items-center justify-center h-16 rounded-lg border-2 border-dashed text-xs transition-colors ${
                      isOver ? 'border-blue-400 text-blue-400 bg-blue-50' : 'border-gray-200 text-gray-300'
                    }`}>
                      {isOver ? 'Drop here' : 'Empty'}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppLayout>
  )
}
