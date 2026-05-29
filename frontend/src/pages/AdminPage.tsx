import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, Plus, Trash2, Shield, ShieldOff, KeyRound,
  Loader2, X, Check, AlertCircle, UserCheck, UserX,
  ChevronDown, Eye, EyeOff,
} from 'lucide-react'
import {
  adminListUsers, adminCreateUser, adminUpdateUser,
  adminDeleteUser, adminResetPassword,
} from '../api/admin'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types'
import clsx from 'clsx'

// ── Invite / Create modal ───────────────────────────────────────────────────
function CreateUserModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'user' | 'admin'>('user')
  const [showPw, setShowPw] = useState(false)

  const mutation = useMutation({
    mutationFn: () => adminCreateUser({ email, full_name: fullName, password, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose() },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Add New User</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Full Name *</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
              placeholder="Jane Smith" autoFocus
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="jane@company.com"
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Temporary Password *</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none pr-10" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Role</label>
            <div className="flex gap-3">
              {(['user', 'admin'] as const).map(r => (
                <button key={r} onClick={() => setRole(r)}
                  className={clsx('flex-1 py-2 rounded-xl border text-sm font-medium transition-colors',
                    role === r
                      ? r === 'admin' ? 'border-amber-500/60 bg-amber-500/10 text-amber-400' : 'border-indigo-500/60 bg-indigo-500/10 text-indigo-400'
                      : 'border-gray-700 text-gray-500 hover:border-gray-600')}>
                  {r === 'admin' ? '👑 Admin' : '👤 User'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-1.5">
              {role === 'admin' ? 'Can manage all users and workspaces.' : 'Can create workspaces and upload documents.'}
            </p>
          </div>
        </div>

        {mutation.isError && (
          <div className="flex items-center gap-2 mt-4 text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(mutation.error as any)?.response?.data?.detail ?? 'Failed to create user'}
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-700 rounded-xl text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!email || !fullName || !password || mutation.isPending}
            className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create User
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reset Password modal ────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }: { user: User; onClose: () => void }) {
  const qc = useQueryClient()
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [done, setDone] = useState(false)

  const mutation = useMutation({
    mutationFn: () => adminResetPassword(user.id, password),
    onSuccess: () => { setDone(true); setTimeout(onClose, 1500) },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Reset Password</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-gray-400 mb-4">Setting new password for <span className="text-white font-medium">{user.full_name}</span></p>

        {done ? (
          <div className="flex items-center justify-center gap-2 py-4 text-green-400">
            <Check className="w-5 h-5" /> Password updated successfully
          </div>
        ) : (
          <>
            <div className="relative mb-4">
              <input type={showPw ? 'text' : 'password'} value={password}
                onChange={e => setPassword(e.target.value)} placeholder="New password (min. 6 chars)" autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none pr-10" />
              <button type="button" onClick={() => setShowPw(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mutation.isError && (
              <p className="text-xs text-red-400 mb-3">{(mutation.error as any)?.response?.data?.detail}</p>
            )}
            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-700 rounded-xl text-sm text-gray-300 hover:bg-gray-800">Cancel</button>
              <button onClick={() => mutation.mutate()} disabled={password.length < 6 || mutation.isPending}
                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2">
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Reset
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── User row ────────────────────────────────────────────────────────────────
function UserRow({ user, isSelf }: { user: User; isSelf: boolean }) {
  const qc = useQueryClient()
  const [showReset, setShowReset] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const toggleActive = useMutation({
    mutationFn: () => adminUpdateUser(user.id, { is_active: !user.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const toggleRole = useMutation({
    mutationFn: () => adminUpdateUser(user.id, { role: user.role === 'admin' ? 'user' : 'admin' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })
  const deleteUser = useMutation({
    mutationFn: () => adminDeleteUser(user.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  return (
    <>
      <tr className="border-b border-gray-800/60 hover:bg-gray-800/30 transition-colors group">
        {/* Avatar + Name */}
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-600/80 flex items-center justify-center text-sm font-bold text-white shrink-0">
              {user.full_name[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 flex items-center gap-1.5">
                {user.full_name}
                {isSelf && <span className="text-xs text-indigo-400 font-normal">(you)</span>}
              </p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
        </td>

        {/* Role */}
        <td className="px-4 py-3">
          <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium',
            user.role === 'admin'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-gray-700/50 text-gray-400 border border-gray-700')}>
            {user.role === 'admin' ? <Shield className="w-3 h-3" /> : <Users className="w-3 h-3" />}
            {user.role === 'admin' ? 'Admin' : 'User'}
          </span>
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span className={clsx('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
            user.is_active ? 'bg-green-500/15 text-green-400' : 'bg-red-500/15 text-red-400')}>
            {user.is_active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
            {user.is_active ? 'Active' : 'Disabled'}
          </span>
        </td>

        {/* Joined */}
        <td className="px-4 py-3 text-xs text-gray-500">
          {new Date(user.created_at).toLocaleDateString()}
        </td>

        {/* Actions */}
        <td className="px-4 py-3">
          {!isSelf && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Toggle role */}
              <button onClick={() => toggleRole.mutate()} disabled={toggleRole.isPending}
                title={user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-amber-400 hover:bg-gray-700 transition-colors">
                {toggleRole.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                  user.role === 'admin' ? <ShieldOff className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
              </button>

              {/* Toggle active */}
              <button onClick={() => toggleActive.mutate()} disabled={toggleActive.isPending}
                title={user.is_active ? 'Disable account' : 'Enable account'}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-yellow-400 hover:bg-gray-700 transition-colors">
                {toggleActive.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
                  user.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
              </button>

              {/* Reset password */}
              <button onClick={() => setShowReset(true)} title="Reset password"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-blue-400 hover:bg-gray-700 transition-colors">
                <KeyRound className="w-3.5 h-3.5" />
              </button>

              {/* Delete */}
              <button onClick={() => { if (confirm(`Delete ${user.full_name}?`)) deleteUser.mutate() }}
                disabled={deleteUser.isPending} title="Delete user"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors">
                {deleteUser.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </td>
      </tr>
      {showReset && <ResetPasswordModal user={user} onClose={() => setShowReset(false)} />}
    </>
  )
}

// ── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user: currentUser } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminListUsers,
  })

  const activeCount = users.filter(u => u.is_active).length
  const adminCount = users.filter(u => u.role === 'admin').length

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" /> User Management
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">Add, edit, and manage user access</p>
            </div>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors">
              <Plus className="w-4 h-4" /> Add User
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Users', value: users.length, color: 'text-white' },
              { label: 'Active', value: activeCount, color: 'text-green-400' },
              { label: 'Admins', value: adminCount, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">User</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Role</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Joined</th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <UserRow key={u.id} user={u} isSelf={u.id === currentUser?.id} />
                  ))}
                </tbody>
              </table>
            )}
            {!isLoading && users.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-sm">No users found</div>
            )}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5 text-amber-500" /> Toggle admin role</span>
            <span className="flex items-center gap-1.5"><UserX className="w-3.5 h-3.5 text-yellow-500" /> Disable / enable account</span>
            <span className="flex items-center gap-1.5"><KeyRound className="w-3.5 h-3.5 text-blue-400" /> Reset password</span>
            <span className="flex items-center gap-1.5"><Trash2 className="w-3.5 h-3.5 text-red-400" /> Delete user</span>
          </div>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
