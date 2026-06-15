'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import AppLayout from '../components/AppLayout'

type OrgUser = { id: string; email: string; role: string; full_name: string | null; created_at: string }
type Org = { id: string; name: string; plan: string; created_at: string; users: OrgUser[] }

const ADMIN_EMAILS = ['tegnarski13@gmail.com', 'tegcoding13@gmail.com']

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)

  // New dealership form
  const [newDealer, setNewDealer] = useState({ dealershipName: '', email: '', password: '', fullName: '' })
  const [dealerSaving, setDealerSaving] = useState(false)
  const [dealerResult, setDealerResult] = useState<{ type: 'success' | 'error'; msg: string } | null>(null)

  // Add user to org modal
  const [addUserOrg, setAddUserOrg] = useState<Org | null>(null)
  const [newUser, setNewUser] = useState({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'member' })
  const [userSaving, setUserSaving] = useState(false)

  // Edit user modal
  const [editUser, setEditUser] = useState<(OrgUser & { orgId: string }) | null>(null)
  const [editForm, setEditForm] = useState({ email: '', password: '' })
  const [editSaving, setEditSaving] = useState(false)

  // Delete confirm
  const [deleteUser, setDeleteUser] = useState<OrgUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !ADMIN_EMAILS.includes(user.email ?? '')) { setAllowed(false); return }
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        setToken(session.access_token)
        setAllowed(true)
        fetchOrgs(session.access_token)
      }
    }
    init()
  }, [])

  const fetchOrgs = async (t?: string) => {
    setLoading(true)
    const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t || token}` } })
    const data = await res.json()
    setOrgs(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const handleCreateDealership = async (e: React.FormEvent) => {
    e.preventDefault()
    setDealerSaving(true)
    setDealerResult(null)
    const res = await fetch('/api/admin/create-dealership', { method: 'POST', headers: authHeaders, body: JSON.stringify(newDealer) })
    const data = await res.json()
    if (!res.ok) { setDealerResult({ type: 'error', msg: data.error }); setDealerSaving(false); return }
    setDealerResult({ type: 'success', msg: `✓ Created "${data.org.name}"` })
    setNewDealer({ dealershipName: '', email: '', password: '', fullName: '' })
    fetchOrgs()
    setDealerSaving(false)
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addUserOrg) return
    setUserSaving(true)
    const fullName = [newUser.firstName, newUser.lastName].filter(Boolean).join(' ') || undefined
    const res = await fetch('/api/admin/users', { method: 'POST', headers: authHeaders, body: JSON.stringify({ orgId: addUserOrg.id, email: newUser.email, password: newUser.password, role: newUser.role, fullName }) })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setUserSaving(false); return }
    setAddUserOrg(null)
    setNewUser({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'member' })
    fetchOrgs()
    setUserSaving(false)
  }

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return
    setEditSaving(true)
    const res = await fetch('/api/admin/users', { method: 'PATCH', headers: authHeaders, body: JSON.stringify({ userId: editUser.id, ...editForm }) })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setEditSaving(false); return }
    setEditUser(null)
    fetchOrgs()
    setEditSaving(false)
  }

  const handleDeleteUser = async () => {
    if (!deleteUser) return
    setDeleting(true)
    const res = await fetch('/api/admin/users', { method: 'DELETE', headers: authHeaders, body: JSON.stringify({ userId: deleteUser.id }) })
    const data = await res.json()
    if (!res.ok) { alert(data.error); setDeleting(false); return }
    setDeleteUser(null)
    fetchOrgs()
    setDeleting(false)
  }

  if (allowed === null) return <AppLayout><div className="flex items-center justify-center h-64 text-gray-400">Loading…</div></AppLayout>
  if (allowed === false) return <AppLayout><div className="flex items-center justify-center h-64 text-red-400">Access denied.</div></AppLayout>

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
  const btnGreen = 'px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50'

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>

        {/* Create dealership */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Create New Dealership</h2>
          <form onSubmit={handleCreateDealership} className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Dealership name *</label>
                <input required placeholder="Green Valley Motors" value={newDealer.dealershipName}
                  onChange={e => setNewDealer({ ...newDealer, dealershipName: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin first name</label>
                <input placeholder="Jane" value={newDealer.fullName?.split(' ')[0] || ''}
                  onChange={e => setNewDealer({ ...newDealer, fullName: `${e.target.value} ${newDealer.fullName?.split(' ').slice(1).join(' ') || ''}`.trim() })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin last name</label>
                <input placeholder="Smith" value={newDealer.fullName?.split(' ').slice(1).join(' ') || ''}
                  onChange={e => setNewDealer({ ...newDealer, fullName: `${newDealer.fullName?.split(' ')[0] || ''} ${e.target.value}`.trim() })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Admin email *</label>
                <input required type="email" placeholder="admin@dealership.com" value={newDealer.email}
                  onChange={e => setNewDealer({ ...newDealer, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temp password *</label>
                <input required placeholder="TempPass123!" value={newDealer.password}
                  onChange={e => setNewDealer({ ...newDealer, password: e.target.value })} className={inp} />
              </div>
            </div>
            {dealerResult && (
              <p className={`text-sm px-3 py-2 rounded-lg ${dealerResult.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {dealerResult.msg}
              </p>
            )}
            <button type="submit" disabled={dealerSaving} className={btnGreen} style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)' }}>
              {dealerSaving ? 'Creating…' : '+ Create Dealership'}
            </button>
          </form>
        </div>

        {/* Dealerships + users */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">All Dealerships ({orgs.length})</h2>
          {loading ? (
            <div className="text-gray-400 text-sm py-6 text-center">Loading…</div>
          ) : orgs.map(org => (
            <div key={org.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Org header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-900">{org.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${org.plan === 'pro' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {org.plan}
                  </span>
                  <span className="text-xs text-gray-400">{org.users.length} user{org.users.length !== 1 ? 's' : ''}</span>
                </div>
                <button onClick={() => { setAddUserOrg(org); setNewUser({ firstName: '', lastName: '', email: '', password: '', phone: '', role: 'member' }) }}
                  className="text-xs px-3 py-1.5 bg-green-50 text-green-700 font-medium rounded-lg hover:bg-green-100">
                  + Add User
                </button>
              </div>

              {/* Users table */}
              {org.users.length === 0 ? (
                <p className="px-5 py-4 text-sm text-gray-400">No users yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-100">
                    <tr>
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500">Name</th>
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500">Email</th>
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500">Role</th>
                      <th className="text-left px-5 py-2.5 font-medium text-gray-500">Joined</th>
                      <th className="px-5 py-2.5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {org.users.map(user => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">{user.full_name || <span className="text-gray-400 font-normal">—</span>}</td>
                        <td className="px-5 py-3 text-gray-600">{user.email}</td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-400 text-xs">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-2 justify-end">
                            <button
                              onClick={() => { setEditUser({ ...user, orgId: org.id }); setEditForm({ email: user.email, password: '' }) }}
                              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => setDeleteUser(user)}
                              className="text-xs px-3 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add user modal */}
      {addUserOrg && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Add User</h2>
            <p className="text-sm text-gray-400 mb-4">Adding to <span className="font-medium text-gray-700">{addUserOrg.name}</span></p>
            <form onSubmit={handleAddUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">First name *</label>
                  <input required placeholder="First name" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Last name *</label>
                  <input required placeholder="Last name" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email *</label>
                <input required type="email" placeholder="employee@dealership.com" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phone</label>
                <input type="tel" placeholder="Phone number" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temp password *</label>
                <input required placeholder="TempPass123!" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Role</label>
                <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className={inp}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={userSaving} className={`flex-1 ${btnGreen}`} style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)' }}>
                  {userSaving ? 'Adding…' : 'Add User'}
                </button>
                <button type="button" onClick={() => setAddUserOrg(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit user modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit User</h2>
            <form onSubmit={handleEditUser} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} className={inp} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New password <span className="text-gray-400">(leave blank to keep current)</span></label>
                <input type="text" placeholder="New password…" value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} className={inp} />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={editSaving} className={`flex-1 ${btnGreen}`} style={{ background: 'linear-gradient(to right, #367C2B, #4a9e38)' }}>
                  {editSaving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900">Delete user?</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              This will permanently delete <span className="font-medium text-gray-800">{deleteUser.email}</span> and remove their access. Their leads and data will remain.
            </p>
            <div className="flex gap-2">
              <button onClick={handleDeleteUser} disabled={deleting} className={`flex-1 bg-red-600 hover:bg-red-700 ${btnGreen}`}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button onClick={() => setDeleteUser(null)} className="flex-1 bg-gray-100 text-gray-700 rounded-lg py-2 text-sm font-medium hover:bg-gray-200">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
