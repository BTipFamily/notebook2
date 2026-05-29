import { useState, useRef, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Send, Loader2, Sparkles, MessageSquare } from 'lucide-react'
import { sendMessage, listConversations, getMessages } from '../../api/chat'
import { useAuthStore } from '../../stores/authStore'
import ChatMessage from './ChatMessage'
import type { Message, Citation } from '../../types'

const SUGGESTED = [
  'Summarize all documents in this workspace',
  'What are the key risks and action items?',
  'Create an executive summary',
  'What decisions need to be made?',
  'Compare the documents and highlight differences',
  'What are the main requirements?',
]

interface LocalMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
}

export default function ChatPanel({ workspaceId }: { workspaceId: number }) {
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const [conversationId, setConversationId] = useState<number | undefined>()
  const [messages, setMessages] = useState<LocalMessage[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const mutation = useMutation({
    mutationFn: (msg: string) => sendMessage(workspaceId, msg, conversationId),
    onSuccess: (data) => {
      setConversationId(data.conversation_id)
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.content, citations: data.citations },
      ])
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '⚠️ Something went wrong. Please try again.' },
      ])
    },
  })

  const handleSend = () => {
    const msg = input.trim()
    if (!msg || mutation.isPending) return
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    mutation.mutate(msg)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, mutation.isPending])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (ta) {
      ta.style.height = 'auto'
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
    }
  }, [input])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 shrink-0">
        <Sparkles className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-medium text-gray-200">AI Assistant</span>
        {conversationId && (
          <button
            onClick={() => { setMessages([]); setConversationId(undefined) }}
            className="ml-auto text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            New chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isEmpty ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-3">
              <MessageSquare className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-gray-300 mb-1">Ask anything about your documents</p>
            <p className="text-xs text-gray-500 mb-6 max-w-[240px]">
              Upload documents first, then ask questions to get AI-powered insights with source citations.
            </p>
            <div className="w-full space-y-2">
              {SUGGESTED.map((s) => (
                <button
                  key={s}
                  onClick={() => { setInput(s); textareaRef.current?.focus() }}
                  className="w-full text-left text-xs px-3 py-2 bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-400 hover:text-gray-200 hover:border-indigo-600/40 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <ChatMessage
              key={i}
              role={m.role}
              content={m.content}
              citations={m.citations}
              userName={user?.full_name}
            />
          ))
        )}

        {mutation.isPending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs shrink-0">✦</div>
            <div className="bg-gray-800 border border-gray-700/50 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 shrink-0">
        <div className="flex items-end gap-2 bg-gray-800 border border-gray-700 rounded-2xl px-3 py-2 focus-within:border-indigo-500/60 transition-colors">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question… (Enter to send)"
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 resize-none focus:outline-none min-h-[24px]"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || mutation.isPending}
            className="w-7 h-7 flex items-center justify-center rounded-xl bg-indigo-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-500 transition-colors shrink-0"
          >
            {mutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-600 text-center mt-1.5">Shift+Enter for new line</p>
      </div>
    </div>
  )
}
