'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const PERSON_COLORS = ['#e85d4a', '#4b9ef4', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#0ea5e9', '#f97316']

const NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
  )},
  { label: 'Leads', href: '/leads', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
  { label: 'Pipeline', href: '/pipeline', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
  )},
  { label: 'Activities', href: '/activities', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  )},
  { label: 'Tasks', href: '/tasks', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
  )},
  { label: 'Calendar', href: '/calendar', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
  )},
  { label: 'Import', href: '/import', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
  )},
  { label: 'Settings', href: '/settings', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
  )},
]

type TeamMember = { name: string; taskCount: number }

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [openTasks, setOpenTasks] = useState(0)
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    const fetchCount = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: memberData } = await supabase.from('org_members').select('full_name').eq('user_id', user?.id ?? '').maybeSingle()
      const name = memberData?.full_name
      let query = supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open')
      if (name) query = query.eq('assigned_to', name)
      const { count } = await query
      setOpenTasks(count || 0)
    }

    const fetchTeam = async () => {
      const { data: members } = await supabase.from('org_members').select('full_name, user_id')
      const names = (members || [])
        .map(m => m.full_name)
        .filter(Boolean) as string[]
      const counts = await Promise.all(names.map(async name => {
        const { count } = await supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'open').eq('assigned_to', name)
        return { name, taskCount: count || 0 }
      }))
      setTeam(counts)
    }

    fetchCount()
    fetchTeam()
    const interval = setInterval(() => { fetchCount(); fetchTeam() }, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  return (
    <aside className="w-56 bg-[#367C2B] min-h-screen flex flex-col shrink-0">
      <div className="px-4 py-5 border-b border-white/10">
        <Image src="/logo.png" alt="IronFlow CRM" width={160} height={55} className="object-contain w-full" priority />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ label, href, icon }) => {
          const active = pathname === href
          const showBadge = label === 'Tasks' && openTasks > 0
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-white/20 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
            >
              {icon}
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 animate-pulse">
                  {openTasks > 99 ? '99+' : openTasks}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Team members */}
      {team.length > 0 && (
        <div className="px-3 pb-3 border-t border-white/10 pt-3 space-y-1">
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest px-1 mb-2">Team</p>
          {team.map((member, i) => {
            const color = PERSON_COLORS[i % PERSON_COLORS.length]
            return (
              <button
                key={member.name}
                onClick={() => router.push(`/dashboard?person=${encodeURIComponent(member.name)}`)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg font-semibold text-sm text-white transition-opacity hover:opacity-90"
                style={{ background: color }}
              >
                <span>{member.name.split(' ')[0]} {member.name.split(' ')[1]?.[0] ? member.name.split(' ')[1][0] + '.' : ''}</span>
                {member.taskCount > 0 && (
                  <span className="bg-white/25 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[22px] text-center">
                    {member.taskCount}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-white/60 hover:bg-white/10 hover:text-white transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign out
        </button>
      </div>
    </aside>
  )
}
