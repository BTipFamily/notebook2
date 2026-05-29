import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { FileText, Loader2, Download, Copy, Check, ChevronDown } from 'lucide-react'
import { generateReport } from '../../api/chat'
import type { ReportType } from '../../types'
import clsx from 'clsx'

const REPORT_TYPES: { value: ReportType; label: string; description: string; icon: string }[] = [
  { value: 'executive_summary', label: 'Executive Summary', description: 'High-level overview for leadership', icon: '📋' },
  { value: 'action_items', label: 'Action Items', description: 'Extract all tasks and next steps', icon: '✅' },
  { value: 'risk_analysis', label: 'Risk Analysis', description: 'Risks, dependencies, mitigations', icon: '⚠️' },
  { value: 'meeting_prep', label: 'Meeting Prep', description: 'Background, agenda, open issues', icon: '🗓️' },
  { value: 'faq', label: 'FAQ Document', description: 'Common questions and answers', icon: '❓' },
  { value: 'technical_deep_dive', label: 'Technical Deep Dive', description: 'Detailed technical analysis', icon: '🔬' },
]

export default function ReportPanel({ workspaceId }: { workspaceId: number }) {
  const [selectedType, setSelectedType] = useState<ReportType>('executive_summary')
  const [customInstructions, setCustomInstructions] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mutation = useMutation({
    mutationFn: () => generateReport(workspaceId, selectedType, customInstructions || undefined),
    onSuccess: (data) => setGeneratedContent(data.content),
  })

  const handleCopy = async () => {
    if (!generatedContent) return
    await navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownload = () => {
    if (!generatedContent) return
    const blob = new Blob([generatedContent], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedType}_${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectedReport = REPORT_TYPES.find((r) => r.value === selectedType)!

  return (
    <div className="flex flex-col h-full">
      {!generatedContent ? (
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-5">
            <h3 className="text-sm font-semibold text-gray-200 mb-1">Generate Report</h3>
            <p className="text-xs text-gray-500">AI will analyze all workspace documents and generate a structured output.</p>
          </div>

          <div className="grid grid-cols-1 gap-2 mb-4">
            {REPORT_TYPES.map((rt) => (
              <button
                key={rt.value}
                onClick={() => setSelectedType(rt.value)}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors',
                  selectedType === rt.value
                    ? 'border-indigo-500/60 bg-indigo-600/10 text-white'
                    : 'border-gray-700/50 bg-gray-800/30 text-gray-400 hover:border-gray-600 hover:text-gray-200',
                )}
              >
                <span className="text-lg shrink-0">{rt.icon}</span>
                <div>
                  <p className="text-xs font-medium">{rt.label}</p>
                  <p className="text-xs text-gray-500">{rt.description}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowCustom((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 mb-2 transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showCustom ? 'rotate-180' : ''}`} />
            Custom instructions
          </button>

          {showCustom && (
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g. Focus on Q3 deliverables only. Use bullet points throughout."
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:border-indigo-500 focus:outline-none resize-none mb-4"
            />
          )}

          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating {selectedReport.label}…
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate {selectedReport.label}
              </>
            )}
          </button>

          {mutation.isError && (
            <p className="text-xs text-red-400 mt-3 text-center">
              {(mutation.error as any)?.response?.data?.detail ?? 'Generation failed. Check your API key and documents.'}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-800 shrink-0">
            <span className="text-xs font-medium text-gray-300 flex-1">{selectedReport.icon} {selectedReport.label}</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              .md
            </button>
            <button
              onClick={() => setGeneratedContent(null)}
              className="text-xs text-gray-600 hover:text-gray-400 transition-colors ml-1"
            >
              ← Back
            </button>
          </div>
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="chat-prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{generatedContent}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
