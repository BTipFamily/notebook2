import { useState } from 'react'
import { FileText, FileSpreadsheet, Presentation, Trash2, Loader2, CheckCircle2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteDocument } from '../../api/documents'
import type { Document } from '../../types'

const FILE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4 text-red-400" />,
  docx: <FileText className="w-4 h-4 text-blue-400" />,
  doc: <FileText className="w-4 h-4 text-blue-400" />,
  pptx: <Presentation className="w-4 h-4 text-orange-400" />,
  xlsx: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
  csv: <FileSpreadsheet className="w-4 h-4 text-green-400" />,
  txt: <FileText className="w-4 h-4 text-gray-400" />,
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentCard({ doc, workspaceId }: { doc: Document; workspaceId: number }) {
  const qc = useQueryClient()
  const [showSummary, setShowSummary] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(workspaceId, doc.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents', workspaceId] }),
  })

  const icon = FILE_ICONS[doc.file_type] ?? <FileText className="w-4 h-4 text-gray-400" />

  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3.5 hover:border-gray-600 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-gray-700/60 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-200 truncate" title={doc.original_name}>
            {doc.original_name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {doc.status === 'processing' && (
              <span className="flex items-center gap-1 text-xs text-yellow-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                Processing…
              </span>
            )}
            {doc.status === 'ready' && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Ready
              </span>
            )}
            {doc.status === 'error' && (
              <span className="flex items-center gap-1 text-xs text-red-400" title={doc.error_message}>
                <AlertCircle className="w-3 h-3" />
                Error
              </span>
            )}
            <span className="text-xs text-gray-500">·</span>
            <span className="text-xs text-gray-500">{formatBytes(doc.file_size)}</span>
            {doc.page_count > 0 && (
              <>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{doc.page_count}p</span>
              </>
            )}
            {doc.chunk_count > 0 && (
              <>
                <span className="text-xs text-gray-500">·</span>
                <span className="text-xs text-gray-500">{doc.chunk_count} chunks</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {doc.summary && (
            <button
              onClick={() => setShowSummary((s) => !s)}
              className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            >
              {showSummary ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
          <button
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
            className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-red-400 hover:bg-gray-700 transition-colors"
          >
            {deleteMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {showSummary && doc.summary && (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
          <p className="text-xs text-gray-400 leading-relaxed">{doc.summary}</p>
        </div>
      )}
    </div>
  )
}
