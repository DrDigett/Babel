import { BrowserRouter, Routes, Route, Navigate, type ReactNode } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import NodeDetail from './pages/NodeDetail'
import GraphView from './pages/GraphView'
import ImportExport from './pages/ImportExport'
import NotFoundPage from './pages/NotFoundPage'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <div style={{ color: '#546E7A', padding: 40, fontFamily: "'JetBrains Mono', monospace" }}>Cargando...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
          <Route path="/graph" element={<ProtectedRoute><Layout><GraphView /></Layout></ProtectedRoute>} />
          <Route path="/node/:id" element={<ProtectedRoute><Layout><NodeDetail /></Layout></ProtectedRoute>} />
          <Route path="/data" element={<ProtectedRoute><Layout><ImportExport /></Layout></ProtectedRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
