import client from './client'
import type { User } from '../types'

export interface AdminCreateUserPayload {
  email: string
  full_name: string
  password: string
  role: 'user' | 'admin'
}

export interface AdminUpdateUserPayload {
  full_name?: string
  role?: 'user' | 'admin'
  is_active?: boolean
}

export const adminListUsers = () =>
  client.get<User[]>('/auth/admin/users').then((r) => r.data)

export const adminCreateUser = (data: AdminCreateUserPayload) =>
  client.post<User>('/auth/admin/users', data).then((r) => r.data)

export const adminUpdateUser = (id: number, data: AdminUpdateUserPayload) =>
  client.put<User>(`/auth/admin/users/${id}`, data).then((r) => r.data)

export const adminDeleteUser = (id: number) =>
  client.delete(`/auth/admin/users/${id}`).then((r) => r.data)

export const adminResetPassword = (id: number, new_password: string) =>
  client.post(`/auth/admin/users/${id}/reset-password`, { new_password }).then((r) => r.data)
