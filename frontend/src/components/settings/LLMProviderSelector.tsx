import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, ChevronDown, Check, Loader2, AlertCircle } from 'lucide-react'
import { getAIProvider, setAIProvider } from '../../api/settings'
import type { ProviderInfo } from '../../api/settings'
import clsx from 'clsx'

export default function LLMProviderSelector() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['ai-provider'],
    queryFn: getAIProvider,
    staleTime: 30_000,
  })

  const mutation = useMutation({
    mutationFn: setAIProvider,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-provider'] })
      setOpen(false)
    },
  })

  // Close dropdown when clicking outside
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const current = data?.providers.find(p => p.id === data.current)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-gray-500">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Loading AI provider…
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-red-500">
        <AlertCircle className="w-3.5 h-3.5" />
        Failed to load AI settings
      </div>
    )
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors',
          open ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800',
        )}
        title="Switch AI provider"
      >
        <Bot className="w-4 h-4 shrink-0 text-indigo-400" />
        <span className="flex-1 text-left truncate font-medium">
          {current?.label ?? data.current}
        </span>
        {mutation.isPending
          ? <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
          : <ChevronDown className={clsx('w-3.5 h-3.5 text-gray-500 transition-transform', open && 'rotate-180')} />
        }
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-850 bg-gray-900 border border-gray-700 rounded-xl shadow-xl overflow-hidden z-50">
          <p className="text-xs text-gray-500 px-3 pt-2.5 pb-1 uppercase tracking-wider font-medium">AI Provider</p>
          {data.providers.map((p: ProviderInfo) => {
            const isActive = p.id === data.current
            const isMutating = mutation.isPending && mutation.variables === p.id
            return (
              <button
                key={p.id}
                onClick={() => !isActive && mutation.mutate(p.id)}
                disabled={isActive || mutation.isPending || !p.configured}
                className={clsx(
                  'w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                  isActive
                    ? 'bg-indigo-600/15 cursor-default'
                    : !p.configured
                    ? 'opacity-40 cursor-not-allowed'
                    : 'hover:bg-gray-800 cursor-pointer',
                )}
              >
                <div className="flex-1 min-w-0 mt-0.5">
                  <p className={clsx('text-xs font-medium truncate', isActive ? 'text-indigo-300' : 'text-gray-200')}>
                    {p.label}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{p.description}</p>
                  {!p.configured && (
                    <p className="text-xs text-amber-500/80 mt-0.5">Missing credentials</p>
                  )}
                </div>
                <div className="shrink-0 mt-0.5">
                  {isMutating
                    ? <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                    : isActive
                    ? <Check className="w-3.5 h-3.5 text-indigo-400" />
                    : null
                  }
                </div>
              </button>
            )
          })}
          {mutation.isError && (
            <p className="text-xs text-red-400 px-3 pb-2 mt-0.5">
              {(mutation.error as any)?.response?.data?.detail ?? 'Failed to switch provider'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
