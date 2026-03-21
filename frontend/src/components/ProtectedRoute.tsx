import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, authRequired } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  // If AUTH_REQUIRED=false (local dev), bypass auth entirely
  if (!authRequired) return <>{children}</>
  const IS_DEMO = !import.meta.env.VITE_API_URL && import.meta.env.MODE === 'production'
  if (!isAuthenticated && !IS_DEMO) return <Navigate to="/login" />
  return <>{children}</>
}
