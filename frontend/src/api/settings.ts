import client from './client'

export interface ProviderInfo {
  id: string
  label: string
  description: string
  requires: string[]
  configured: boolean
}

export interface AIProviderStatus {
  current: string
  providers: ProviderInfo[]
}

export const getAIProvider = (): Promise<AIProviderStatus> =>
  client.get<AIProviderStatus>('/settings/ai-provider').then(r => r.data)

export const setAIProvider = (provider: string): Promise<AIProviderStatus> =>
  client.put<AIProviderStatus>('/settings/ai-provider', { provider }).then(r => r.data)
