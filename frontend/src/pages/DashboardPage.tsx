import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, FileText, Clock, Sparkles } from 'lucide-react'
import { listWorkspaces } from '../api/workspaces'
import { useAuthStore } from '../stores/authStore'
import CreateWorkspaceModal from '../components/workspace/CreateWorkspaceModal'

function WorkspaceCard({ ws }: { ws: any }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/workspace/${ws.id}`)}
      className="text-left bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-gray-700 hover:bg-gray-800/60 transition-all group"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
          style={{ backgroundColor: `${ws.color}22`, border: `1px solid ${ws.color}44` }}
        >
          {ws.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-100 group-hover:text-white transition-colors truncate">
            {ws.name}
          </h3>
          {ws.description && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{ws.description}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3" />
          {ws.document_count} doc{ws.document_count !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {new Date(ws.updated_at).toLocaleDateString()}
        </span>
      </div>
    </button>
  )
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const [showCreate, setShowCreate] = useState(false)
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: listWorkspaces,
  })

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
              {user?.full_name?.split(' ')[0]}
            </h1>
            <p className="text-gray-500 mt-1">Your enterprise knowledge platform</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Workspaces', value: workspaces.length, icon: BookOpen },
              {
                label: 'Documents',
                value: workspaces.reduce((a, w: any) => a + w.document_count, 0),
                icon: FileText,
              },
              { label: 'AI Powered', value: '✓', icon: Sparkles },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                <stat.icon className="w-5 h-5 text-indigo-400 mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Workspaces */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Workspaces</h2>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              New workspace
            </button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-900 border border-gray-800 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-16 bg-gray-900 border border-dashed border-gray-700 rounded-2xl">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400 font-medium mb-1">No workspaces yet</p>
              <p className="text-gray-600 text-sm mb-4">Create a workspace to start organizing your knowledge</p>
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {workspaces.map((ws: any) => (
                <WorkspaceCard key={ws.id} ws={ws} />
              ))}
              <button
                onClick={() => setShowCreate(true)}
                className="h-28 border-2 border-dashed border-gray-800 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-600 hover:border-indigo-600/40 hover:text-indigo-400 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="text-xs">New Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
      {showCreate && <CreateWorkspaceModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
