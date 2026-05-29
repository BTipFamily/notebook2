import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { BookOpen, Loader2, Eye, EyeOff } from 'lucide-react'
import { login, register } from '../api/auth'
import { useAuthStore } from '../stores/authStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('admin@company.com')
  const [password, setPassword] = useState('changeme123')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      mode === 'login'
        ? login({ email, password })
        : register({ email, password, full_name: fullName }),
    onSuccess: (data) => {
      setAuth(data.user, data.access_token)
      navigate('/')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-base font-bold text-white leading-none">Knowledge Workspace</p>
            <p className="text-xs text-gray-500 mt-0.5">Enterprise AI Platform</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-white mb-1">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            {mode === 'login'
              ? 'Sign in to your workspace'
              : 'Start your knowledge workspace'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  placeholder="Jane Smith"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@company.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mutation.isError && (
              <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
                {(mutation.error as any)?.response?.data?.detail ?? 'Authentication failed'}
              </p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-xl transition-colors"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-xs text-gray-500 hover:text-indigo-400 transition-colors"
            >
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          Default: admin@company.com / changeme123
        </p>
      </div>
    </div>
  )
}
