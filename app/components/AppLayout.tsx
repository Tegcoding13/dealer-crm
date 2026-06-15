'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from './Sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/'; return }

      const { data: member } = await supabase
        .from('org_members')
        .select('organization_id')
        .maybeSingle()

      if (!member) { window.location.href = '/setup'; return }

      setReady(true)
    }
    check()
  }, [])

  if (!ready) return (
    <div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
