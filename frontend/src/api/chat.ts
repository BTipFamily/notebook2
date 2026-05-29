import client from './client'
import type { ChatResponse, Conversation, Message, ReportResponse, ReportType } from '../types'

export const sendMessage = (workspaceId: number, message: string, conversationId?: number) =>
  client.post<ChatResponse>(`/workspaces/${workspaceId}/chat`, {
    message,
    conversation_id: conversationId,
  }).then((r) => r.data)

export const listConversations = (workspaceId: number) =>
  client.get<Conversation[]>(`/workspaces/${workspaceId}/conversations`).then((r) => r.data)

export const getMessages = (workspaceId: number, conversationId: number) =>
  client.get<Message[]>(`/workspaces/${workspaceId}/conversations/${conversationId}/messages`).then((r) => r.data)

export const generateReport = (
  workspaceId: number,
  reportType: ReportType,
  customInstructions?: string,
) =>
  client.post<ReportResponse>(`/workspaces/${workspaceId}/reports`, {
    report_type: reportType,
    custom_instructions: customInstructions,
  }).then((r) => r.data)
