import client from './client'
import type { Document } from '../types'

export const listDocuments = (workspaceId: number) =>
  client.get<Document[]>(`/workspaces/${workspaceId}/documents`).then((r) => r.data)

export const uploadDocument = (workspaceId: number, file: File, onProgress?: (pct: number) => void) => {
  const form = new FormData()
  form.append('file', file)
  return client.post<Document>(`/workspaces/${workspaceId}/documents`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
    },
  }).then((r) => r.data)
}

export const deleteDocument = (workspaceId: number, documentId: number) =>
  client.delete(`/workspaces/${workspaceId}/documents/${documentId}`).then((r) => r.data)
