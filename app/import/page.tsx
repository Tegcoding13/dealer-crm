'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type Row = Record<string, string>

const LEAD_FIELDS: { key: string; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Name', required: true },
  { key: 'company', label: 'Company' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Address' },
  { key: 'source', label: 'Source' },
  { key: 'owner', label: 'Owner' },
  { key: 'stage', label: 'Stage' },
  { key: 'value', label: 'Value ($)' },
  { key: 'notes', label: 'Notes' },
]

const VALID_STAGES = new Set(['new', 'contacted', 'qualified', 'proposal', 'closed-won', 'closed-lost'])

type Step = 'upload' | 'map' | 'preview' | 'done'

export default function ImportPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('upload')
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Row[]>([])
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [errors, setErrors] = useState<string[]>([])
  const [dragging, setDragging] = useState(false)

  const parseFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const data = e.target?.result
      const wb = XLSX.read(data, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const json: Row[] = XLSX.utils.sheet_to_json(ws, { defval: '' })
      if (json.length === 0) return
      const cols = Object.keys(json[0])
      setHeaders(cols)
      setRows(json)

      // Auto-map by fuzzy matching column names
      const autoMap: Record<string, string> = {}
      const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
      LEAD_FIELDS.forEach(({ key }) => {
        const match = cols.find(c => normalize(c) === normalize(key)) ||
          cols.find(c => normalize(c).includes(normalize(key))) ||
          cols.find(c => normalize(key).includes(normalize(c)))
        if (match) autoMap[key] = match
      })
      setMapping(autoMap)
      setStep('map')
    }
    reader.readAsBinaryString(file)
  }

  const handleFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['xlsx', 'xls', 'csv'].includes(ext || '')) {
      alert('Please upload a .xlsx, .xls, or .csv file.')
      return
    }
    parseFile(file)
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const preview = rows.slice(0, 5).map(row => {
    const lead: Record<string, string> = {}
    LEAD_FIELDS.forEach(({ key }) => {
      lead[key] = mapping[key] ? row[mapping[key]] ?? '' : ''
    })
    return lead
  })

  const runImport = async () => {
    setImporting(true)
    setErrors([])
    const errs: string[] = []
    let count = 0
    const BATCH = 1000

    const records = rows.map((row, i) => {
      const name = mapping.name ? row[mapping.name]?.trim() : ''
      if (!name) { errs.push(`Row ${i + 2}: missing name, skipped`); return null }

      const rawStage = mapping.stage ? row[mapping.stage]?.trim().toLowerCase() : ''
      const stage = VALID_STAGES.has(rawStage) ? rawStage : 'new'

      const rawValue = mapping.value ? row[mapping.value] : ''
      const value = parseFloat(String(rawValue).replace(/[^0-9.]/g, '')) || 0

      return {
        name,
        company: mapping.company ? row[mapping.company]?.trim() || null : null,
        phone: mapping.phone ? row[mapping.phone]?.trim() || null : null,
        email: mapping.email ? row[mapping.email]?.trim() || null : null,
        source: mapping.source ? row[mapping.source]?.trim() || null : null,
        owner: mapping.owner ? row[mapping.owner]?.trim() || null : null,
        address: mapping.address ? row[mapping.address]?.trim() || null : null,
        notes: mapping.notes ? row[mapping.notes]?.trim() || null : null,
        stage,
        value,
      }
    }).filter((r): r is NonNullable<typeof r> => r !== null)

    for (let i = 0; i < records.length; i += BATCH) {
      const batch = records.slice(i, i + BATCH)
      const { error } = await supabase.from('leads').insert(batch)
      if (error) {
        errs.push(`Batch ${Math.floor(i / BATCH) + 1} failed: ${error.message}`)
      } else {
        count += batch.length
      }
    }

    setImportedCount(count)
    setErrors(errs)
    setImporting(false)
    setStep('done')
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/leads')} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Import Leads</h1>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 text-sm">
          {(['upload', 'map', 'preview', 'done'] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-gray-300" />}
              <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-medium ${step === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                <span className="capitalize">{s}</span>
              </div>
            </div>
          ))}
        </div>

        {/* STEP 1: Upload */}
        {step === 'upload' && (
          <div
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            className={`border-2 border-dashed rounded-xl p-16 text-center transition-colors ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-white'}`}
          >
            <svg className="w-12 h-12 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            <p className="text-gray-600 font-medium mb-1">Drag and drop your file here</p>
            <p className="text-gray-400 text-sm mb-4">Supports .xlsx, .xls, and .csv</p>
            <label className="cursor-pointer bg-blue-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-blue-700">
              Browse files
              <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            </label>
          </div>
        )}

        {/* STEP 2: Map columns */}
        {step === 'map' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
            <div>
              <h2 className="text-base font-semibold text-gray-800">Map your columns</h2>
              <p className="text-sm text-gray-500 mt-1">Your file has {rows.length} rows. Match each CRM field to a column from your file.</p>
            </div>
            <div className="space-y-3">
              {LEAD_FIELDS.map(({ key, label, required }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="w-32 text-sm font-medium text-gray-700 shrink-0">
                    {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                  </span>
                  <select
                    value={mapping[key] || ''}
                    onChange={e => setMapping({ ...mapping, [key]: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— skip —</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  {mapping[key] && (
                    <span className="text-xs text-gray-400 w-32 truncate">
                      e.g. {rows[0]?.[mapping[key]] ?? ''}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep('upload')} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back</button>
              <button
                onClick={() => setStep('preview')}
                disabled={!mapping.name}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Preview →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === 'preview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-1">Preview</h2>
              <p className="text-sm text-gray-500 mb-4">Showing first 5 of {rows.length} rows. Rows missing a name will be skipped.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {LEAD_FIELDS.filter(f => mapping[f.key]).map(f => (
                        <th key={f.key} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{f.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {preview.map((row, i) => (
                      <tr key={i} className={!row.name ? 'opacity-40' : ''}>
                        {LEAD_FIELDS.filter(f => mapping[f.key]).map(f => (
                          <td key={f.key} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[f.key] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('map')} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Back</button>
              <button
                onClick={runImport}
                disabled={importing}
                className="px-5 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {importing ? `Importing…` : `Import ${rows.length} leads`}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === 'done' && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">Import complete</p>
              <p className="text-gray-500 text-sm mt-1">{importedCount} lead{importedCount !== 1 ? 's' : ''} imported successfully</p>
            </div>
            {errors.length > 0 && (
              <div className="text-left bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 space-y-1">
                {errors.map((e, i) => <p key={i}>{e}</p>)}
              </div>
            )}
            <div className="flex gap-3 justify-center">
              <button onClick={() => { setStep('upload'); setRows([]); setHeaders([]); setMapping({}) }} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                Import another file
              </button>
              <button onClick={() => router.push('/leads')} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                View leads →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
