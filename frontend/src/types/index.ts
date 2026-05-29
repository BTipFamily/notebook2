export interface User {
  id: number
  email: string
  full_name: string
  role: 'user' | 'admin'
  is_active: boolean
  avatar_url?: string
  created_at: string
}

export interface Workspace {
  id: number
  name: string
  description?: string
  icon: string
  color: string
  owner_id: number
  document_count: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: number
  workspace_id: number
  filename: string
  original_name: string
  file_type: string
  file_size: number
  status: 'processing' | 'ready' | 'error'
  error_message?: string
  page_count: number
  chunk_count: number
  summary?: string
  created_at: string
}

export interface Message {
  id: number
  conversation_id: number
  role: 'user' | 'assistant'
  content: string
  citations?: string
  created_at: string
}

export interface Citation {
  document_name: string
  document_id?: number
}

export interface ChatResponse {
  message_id: number
  conversation_id: number
  content: string
  citations: Citation[]
  suggested_prompts: string[]
}

export interface Conversation {
  id: number
  workspace_id: number
  title: string
  created_at: string
  updated_at: string
}

export interface ReportResponse {
  report_type: string
  content: string
  workspace_name: string
}

export type ReportType =
  | 'executive_summary'
  | 'action_items'
  | 'risk_analysis'
  | 'meeting_prep'
  | 'faq'
  | 'technical_deep_dive'
