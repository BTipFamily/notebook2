import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { BookOpen } from 'lucide-react'
import type { Citation } from '../../types'

interface Props {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  userName?: string
}

export default function ChatMessage({ role, content, citations = [], userName }: Props) {
  const isUser = role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full shrink-0 mt-0.5 flex items-center justify-center text-xs font-bold ${
          isUser ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-200'
        }`}
      >
        {isUser ? (userName?.[0]?.toUpperCase() ?? 'U') : '✦'}
      </div>

      <div className={`flex-1 max-w-[85%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
        {/* Message bubble */}
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-tr-sm'
              : 'bg-gray-800 border border-gray-700/50 rounded-tl-sm'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="chat-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {/* Citations */}
        {!isUser && citations.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-1">
            {citations.map((c, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 text-xs bg-gray-800 border border-gray-700 text-gray-400 px-2 py-0.5 rounded-full hover:border-indigo-500/50 hover:text-indigo-400 transition-colors cursor-default"
                title={`Source: ${c.document_name}`}
              >
                <BookOpen className="w-2.5 h-2.5" />
                {c.document_name.length > 30 ? c.document_name.slice(0, 30) + '…' : c.document_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
