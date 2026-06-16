'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useOrgId } from '@/lib/use-org-id'
import AppLayout from '../components/AppLayout'

type Tab = 'profile' | 'crm'

export default function SettingsPage() {
  const orgId = useOrgId()
  const [tab, setTab] = useState<Tab>('profile')

  // Profile
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')

  // CRM settings
  const [followup1, setFollowup1] = useState(3)
  const [followup2, setFollowup2] = useState(14)
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmMsg, setCrmMsg] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmail(user.email || '')
        const { data: member } = await supabase
          .from('org_members')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle()
        if (member?.full_name) setFullName(member.full_name)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (!orgId) return
    supabase
      .from('organizations')
      .select('followup_days_1, followup_days_2')
      .eq('id', orgId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.followup_days_1) setFollowup1(data.followup_days_1)
        if (data?.followup_days_2) setFollowup2(data.followup_days_2)
      })
  }, [orgId])

  const saveProfile = async () => {
    setProfileSaving(true)
    setProfileMsg('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('org_members')
      .update({ full_name: fullName.trim() })
      .eq('user_id', user.id)

    if (email !== user.email) {
      const { error } = await supabase.auth.updateUser({ email })
      if (error) {
        setProfileMsg('Error updating email: ' + error.message)
        setProfileSaving(false)
        return
      }
    }

    setProfileMsg('Profile saved!')
    setProfileSaving(false)
  }

  const savePassword = async () => {
    setPasswordMsg('')
    if (!newPassword) return
    if (newPassword !== confirmPassword) { setPasswordMsg('Passwords do not match.'); return }
    if (newPassword.length < 8) { setPasswordMsg('Password must be at least 8 characters.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) { setPasswordMsg('Error: ' + error.message); return }
    setNewPassword('')
    setConfirmPassword('')
    setPasswordMsg('Password updated!')
  }

  const saveCrm = async () => {
    if (!orgId) return
    setCrmSaving(true)
    setCrmMsg('')
    const { error } = await supabase
      .from('organizations')
      .update({ followup_days_1: followup1, followup_days_2: followup2 })
      .eq('id', orgId)
    setCrmMsg(error ? 'Error: ' + error.message : 'Settings saved!')
    setCrmSaving(false)
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <AppLayout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          {(['profile', 'crm'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'profile' ? 'Profile' : 'CRM Settings'}
            </button>
          ))}
        </div>

        {/* Profile tab */}
        {tab === 'profile' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Personal Information</h2>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} className={inp} placeholder="Your name" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} />
                {email !== '' && <p className="text-xs text-gray-400 mt-1">Changing your email will send a confirmation link to the new address.</p>}
              </div>
              {profileMsg && (
                <p className={`text-sm font-medium ${profileMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{profileMsg}</p>
              )}
              <button onClick={saveProfile} disabled={profileSaving}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {profileSaving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Change Password</h2>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New password</label>
                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inp} placeholder="Min 8 characters" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inp} />
              </div>
              {passwordMsg && (
                <p className={`text-sm font-medium ${passwordMsg.startsWith('Error') || passwordMsg.includes('match') || passwordMsg.includes('least') ? 'text-red-600' : 'text-green-600'}`}>
                  {passwordMsg}
                </p>
              )}
              <button onClick={savePassword} disabled={!newPassword}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                Update Password
              </button>
            </div>
          </div>
        )}

        {/* CRM Settings tab */}
        {tab === 'crm' && (
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
              <div>
                <h2 className="text-sm font-semibold text-gray-700">Auto Follow-up Timing</h2>
                <p className="text-xs text-gray-400 mt-1">When a new lead is added, these tasks are automatically created for the assigned salesperson.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-2">First follow-up call — days after lead is created</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={30} value={followup1}
                      onChange={e => setFollowup1(Math.max(1, Number(e.target.value)))}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">days</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">→ &quot;Follow-up call ({followup1} day)&quot;</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-2">Second follow-up call — days after lead is created</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number" min={1} max={90} value={followup2}
                      onChange={e => setFollowup2(Math.max(1, Number(e.target.value)))}
                      className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-500">days</span>
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md font-medium">→ &quot;Follow-up call ({followup2} day)&quot;</span>
                  </div>
                </div>
              </div>

              <div className="pt-1 border-t border-gray-100">
                <div className="text-xs text-gray-400 mb-3">Preview — tasks created for every new lead:</div>
                <div className="space-y-2">
                  {[
                    { title: 'Initial call', days: 'Today', color: 'bg-green-50 text-green-700' },
                    { title: `Follow-up call (${followup1} day)`, days: `Day ${followup1}`, color: 'bg-blue-50 text-blue-700' },
                    { title: `Follow-up call (${followup2} day)`, days: `Day ${followup2}`, color: 'bg-purple-50 text-purple-700' },
                  ].map(t => (
                    <div key={t.title} className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium w-16 text-center ${t.color}`}>{t.days}</span>
                      <span className="text-sm text-gray-700">{t.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {crmMsg && (
                <p className={`text-sm font-medium ${crmMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>{crmMsg}</p>
              )}
              <button onClick={saveCrm} disabled={crmSaving || !orgId}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {crmSaving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
