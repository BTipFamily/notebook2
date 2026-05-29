import client from './client'
import type { Workspace } from '../types'

export interface WorkspacePayload {
  name: string
  description?: string
  icon?: string
  color?: string
}

export const listWorkspaces = () =>
  client.get<Workspace[]>('/workspaces').then((r) => r.data)

export const getWorkspace = (id: number) =>
  client.get<Workspace>(`/workspaces/${id}`).then((r) => r.data)

export const createWorkspace = (data: WorkspacePayload) =>
  client.post<Workspace>('/workspaces', data).then((r) => r.data)

export const updateWorkspace = (id: number, data: Partial<WorkspacePayload>) =>
  client.put<Workspace>(`/workspaces/${id}`, data).then((r) => r.data)

export const deleteWorkspace = (id: number) =>
  client.delete(`/workspaces/${id}`).then((r) => r.data)
