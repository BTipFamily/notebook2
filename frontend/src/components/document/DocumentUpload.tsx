import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { uploadDocument } from '../../api/documents'

const ACCEPTED = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv'],
}

interface FileState {
  id: string
  file: File
  status: 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

export default function DocumentUpload({ workspaceId }: { workspaceId: number }) {
  const qc = useQueryClient()
  const [files, setFiles] = useState<FileState[]>([])

  // Update a single file entry by its stable ID — never by index
  const updateFile = (id: string, patch: Partial<FileState>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  const uploadFile = useCallback(
    async (id: string, file: File) => {
      try {
        await uploadDocument(workspaceId, file, (pct) =>
          updateFile(id, { progress: pct }),
        )
        updateFile(id, { status: 'done', progress: 100 })
        qc.invalidateQueries({ queryKey: ['documents', workspaceId] })
      } catch (err: any) {
        updateFile(id, {
          status: 'error',
          error: err.response?.data?.detail ?? 'Upload failed',
        })
      }
    },
    [workspaceId, qc],
  )

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return

      // Build the new file entries with stable IDs
      const entries: FileState[] = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'uploading',
        progress: 0,
      }))

      // State update is pure — no side effects inside
      setFiles((prev) => [...prev, ...entries])

      // Uploads fire AFTER state update, staggered so UI renders between them
      entries.forEach((entry, i) => {
        setTimeout(() => uploadFile(entry.id, entry.file), i * 150)
      })
    },
    [uploadFile],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED,
    multiple: true,
  })

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id))

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-indigo-500 bg-indigo-500/10'
            : 'border-gray-700 hover:border-indigo-600 hover:bg-gray-800/50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-300">
          {isDragActive ? 'Drop files here' : 'Drag & drop files, or click to browse'}
        </p>
        <p className="text-xs text-gray-500 mt-1">PDF, DOCX, PPTX, XLSX, TXT, CSV — up to 50MB</p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-gray-800/60 rounded-lg px-3 py-2.5 border border-gray-700/50"
            >
              <FileText className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-200 truncate font-medium">{f.file.name}</p>
                {f.status === 'uploading' && (
                  <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-400 mt-0.5">{f.error}</p>
                )}
              </div>

              {f.status === 'uploading' && (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
              )}
              {f.status === 'done' && (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              )}
              {f.status === 'error' && (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              {(f.status === 'done' || f.status === 'error') && (
                <button
                  onClick={() => removeFile(f.id)}
                  className="text-gray-600 hover:text-gray-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
