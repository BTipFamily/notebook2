import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import WorkspacePage from './pages/WorkspacePage'
import AdminPage from './pages/AdminPage'
import Sidebar from './components/layout/Sidebar'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

function ProtectedLayout() {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated()) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex flex-col flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/workspace/:workspaceId" element={<WorkspacePage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
