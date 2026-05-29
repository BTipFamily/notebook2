import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Loader2 } from 'lucide-react'
import { createWorkspace } from '../../api/workspaces'

const ICONS = ['📁', '🚀', '⚡', '🔬', '📊', '🏗️', '🔒', '💡', '🎯', '📋', '🌐', '⚙️']
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4',
]

interface Props {
  onClose: () => void
}

export default function CreateWorkspaceModal({ onClose }: Props) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('📁')
  const [color, setColor] = useState('#6366f1')

  const mutation = useMutation({
    mutationFn: () => createWorkspace({ name, description, icon, color }),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      onClose()
      navigate(`/workspace/${ws.id}`)
    },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">New Workspace</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Icon + Name */}
          <div className="flex gap-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center text-2xl cursor-pointer border border-gray-700">
                {icon}
              </div>
              <div className="absolute top-full mt-1 left-0 bg-gray-800 border border-gray-700 rounded-xl p-2 grid grid-cols-6 gap-1 z-10 hidden peer-focus:grid">
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">Workspace Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Q3 Infrastructure Project"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none"
                autoFocus
              />
            </div>
          </div>

          {/* Icon picker */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center transition-colors ${
                    icon === ic ? 'bg-indigo-600/30 ring-1 ring-indigo-500' : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-gray-400 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === c ? 'scale-110 ring-2 ring-white/40 ring-offset-1 ring-offset-gray-900' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What documents and knowledge belong here?"
              rows={2}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!name.trim() || mutation.isPending}
            className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create Workspace
          </button>
        </div>
      </div>
    </div>
  )
}
