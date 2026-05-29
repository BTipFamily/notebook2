import client from './client'
import type { User } from '../types'

export interface LoginPayload { email: string; password: string }
export interface RegisterPayload { email: string; full_name: string; password: string }
export interface TokenResponse { access_token: string; token_type: string; user: User }

export const login = (data: LoginPayload) =>
  client.post<TokenResponse>('/auth/login', data).then((r) => r.data)

export const register = (data: RegisterPayload) =>
  client.post<TokenResponse>('/auth/register', data).then((r) => r.data)

export const getMe = () =>
  client.get<User>('/auth/me').then((r) => r.data)
