import { useState } from 'react'
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Plus, LogOut, BookOpen, ChevronRight, Users, Loader2 } from 'lucide-react'
import { listWorkspaces } from '../../api/workspaces'
import { useAuthStore } from '../../stores/authStore'
import CreateWorkspaceModal from '../workspace/CreateWorkspaceModal'
import LLMProviderSelector from '../settings/LLMProviderSelector'
import clsx from 'clsx'

export default function Sidebar() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, clearAuth } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)

  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })

  const handleLogout = () => {
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      <aside className="flex flex-col w-64 bg-gray-900 border-r border-gray-800 h-screen shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white leading-none">Knowledge</p>
            <p className="text-xs text-gray-500 mt-0.5">Workspace</p>
          </div>
        </div>

        {/* Workspaces */}
        <div className="flex-1 overflow-y-auto py-3">
          <div className="flex items-center justify-between px-4 mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Workspaces</span>
            <button
              onClick={() => setShowCreate(true)}
              className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              title="New workspace"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
            </div>
          ) : workspaces.length === 0 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="mx-3 w-[calc(100%-1.5rem)] text-left px-3 py-2.5 rounded-lg border border-dashed border-gray-700 text-gray-500 text-xs hover:border-indigo-600 hover:text-indigo-400 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1.5" />
              Create your first workspace
            </button>
          ) : (
            <nav className="space-y-0.5 px-2">
              {workspaces.map((ws) => {
                const isActive = workspaceId === String(ws.id)
                return (
                  <Link
                    key={ws.id}
                    to={`/workspace/${ws.id}`}
                    className={clsx(
                      'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors group',
                      isActive
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-600/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800',
                    )}
                  >
                    <span className="text-base shrink-0">{ws.icon}</span>
                    <span className="flex-1 truncate font-medium">{ws.name}</span>
                    <span className="text-xs text-gray-600 group-hover:text-gray-500">
                      {ws.document_count}
                    </span>
                    {isActive && <ChevronRight className="w-3 h-3 text-indigo-400 shrink-0" />}
                  </Link>
                )
              })}
            </nav>
          )}
        </div>

        {/* AI Provider selector (admin only) */}
        {user?.role === 'admin' && (
          <div className="px-2 pb-1 border-t border-gray-800 pt-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-2.5 mb-1">AI Model</p>
            <LLMProviderSelector />
          </div>
        )}

        {/* Admin link */}
        {user?.role === 'admin' && (
          <div className="px-2 pb-2">
            <Link
              to="/admin"
              className={clsx(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
                location.pathname === '/admin'
                  ? 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
              )}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span className="font-medium">User Management</span>
            </Link>
          </div>
        )}

        {/* User footer */}
        <div className="border-t border-gray-800 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.full_name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-700 text-gray-500 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
