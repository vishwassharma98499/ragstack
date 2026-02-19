import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { BookOpen, Loader2 } from 'lucide-react'

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">RAGStack</h1>
            <p className="text-xs text-gray-500">Local AI · Private · Secure</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-white mb-1">Sign in</h2>
          <p className="text-sm text-gray-400 mb-8">
            Access your private document workspace
          </p>

          <button
            onClick={login}
            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[#0078d4] hover:bg-[#006cbe] text-white font-semibold rounded-xl transition-colors"
          >
            {/* Microsoft logo */}
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Sign in with Microsoft
          </button>

          <div className="mt-6 pt-6 border-t border-gray-800">
            <div className="flex items-start gap-3 text-xs text-gray-500">
              <div className="w-4 h-4 rounded-full bg-green-900/50 border border-green-700 flex items-center justify-center shrink-0 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
              </div>
              <p>
                Your documents are processed and stored locally. Only authentication
                uses Microsoft's servers.
              </p>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Secured by Azure Active Directory · PKCE OAuth2
        </p>
      </div>
    </div>
  )
}
