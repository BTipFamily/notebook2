import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, BarChart2, ArrowLeft, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { getWorkspace, deleteWorkspace } from '../api/workspaces'
import { listDocuments } from '../api/documents'
import DocumentUpload from '../components/document/DocumentUpload'
import DocumentCard from '../components/document/DocumentCard'
import ChatPanel from '../components/chat/ChatPanel'
import ReportPanel from '../components/reports/ReportPanel'
import clsx from 'clsx'

type Tab = 'documents' | 'chat' | 'reports'

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>()
  const wsId = Number(workspaceId)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('chat')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ['workspace', wsId],
    queryFn: () => getWorkspace(wsId),
    enabled: !!wsId,
  })

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['documents', wsId],
    queryFn: () => listDocuments(wsId),
    enabled: !!wsId,
    refetchInterval: (query) => {
      const data = query.state.data
      return Array.isArray(data) && data.some((d) => d.status === 'processing') ? 3000 : false
    },
  })

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteWorkspace(wsId)
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      navigate('/')
    } finally {
      setDeleting(false)
    }
  }

  if (wsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Workspace not found</p>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports', icon: <BarChart2 className="w-4 h-4" /> },
  ]

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-800 shrink-0">
        <button
          onClick={() => navigate('/')}
          className="text-gray-500 hover:text-gray-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 flex-1">
          <span className="text-xl">{workspace.icon}</span>
          <div>
            <h1 className="font-semibold text-gray-100 leading-none">{workspace.name}</h1>
            {workspace.description && (
              <p className="text-xs text-gray-500 mt-0.5">{workspace.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => refetchDocs()}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
            title="Refresh documents"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors"
            title="Delete workspace"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3-panel layout: document list | main panel | chat */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Document list (always visible) */}
        <div className="w-72 border-r border-gray-800 flex flex-col shrink-0">
          <div className="px-4 py-3 border-b border-gray-800">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Documents · {documents.length}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {docsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <p className="text-xs text-gray-600 text-center py-4">No documents yet</p>
            ) : (
              documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} workspaceId={wsId} />
              ))
            )}
          </div>
          {/* Upload zone */}
          <div className="p-3 border-t border-gray-800">
            <DocumentUpload workspaceId={wsId} />
          </div>
        </div>

        {/* Center + Right: Tabbed content + Chat */}
        <div className="flex flex-1 overflow-hidden">
          {/* Center: Tab content (chat or reports) */}
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Tab bar */}
            <div className="flex border-b border-gray-800 shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-4 py-2.5 text-sm border-b-2 transition-colors',
                    tab === t.id
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-gray-500 hover:text-gray-300',
                  )}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {tab === 'chat' && <ChatPanel workspaceId={wsId} />}
              {tab === 'reports' && <ReportPanel workspaceId={wsId} />}
            </div>
          </div>

          {/* Right panel: Always-on chat (when viewing reports) */}
          {tab === 'reports' && (
            <div className="w-80 border-l border-gray-800 flex flex-col overflow-hidden">
              <ChatPanel workspaceId={wsId} />
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-white mb-2">Delete Workspace?</h3>
            <p className="text-sm text-gray-400 mb-5">
              This will permanently delete <strong className="text-white">{workspace.name}</strong> and all its documents and conversations.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 px-4 py-2.5 border border-gray-700 rounded-xl text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl text-sm text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
