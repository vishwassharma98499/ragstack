import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  roles: string[]
}

interface AuthContextValue {
  user: User | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  authRequired: boolean
  login: () => Promise<void>
  logout: () => Promise<void>
  handleCallback: (code: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// ── PKCE helpers ──────────────────────────────────────────────────────────────

function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(values).map(v => charset[v % charset.length]).join('')
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(hash)
  let binary = ''
  bytes.forEach(b => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

// ─────────────────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const API_URL = import.meta.env.VITE_API_URL || ''
  const TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || ''
  const CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || ''
  const REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI || `${window.location.origin}/auth/callback`

  // AUTH_REQUIRED=false means the app works without login (local dev mode)
  const authRequired = import.meta.env.VITE_AUTH_REQUIRED === 'true'

  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(localStorage.getItem('access_token'))

  const login = async () => {
    const verifier = generateRandomString(128)
    const challenge = await generateCodeChallenge(verifier)
    sessionStorage.setItem('code_verifier', verifier)

    const url = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`)
    url.searchParams.set('client_id', CLIENT_ID)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('redirect_uri', REDIRECT_URI)
    url.searchParams.set('scope', 'openid profile email')
    url.searchParams.set('code_challenge', challenge)
    url.searchParams.set('code_challenge_method', 'S256')
    url.searchParams.set('response_mode', 'query')

    window.location.href = url.toString()
  }

  const handleCallback = useCallback(async (code: string) => {
    const codeVerifier = sessionStorage.getItem('code_verifier')
    if (!codeVerifier) throw new Error('Code verifier not found')

    const res = await fetch(`${API_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: codeVerifier }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Authentication failed')
    }

    const data = await res.json()
    localStorage.setItem('access_token', data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    sessionStorage.removeItem('code_verifier')
  }, [API_URL])

  const logout = useCallback(async () => {
    try {
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token')
      setToken(null)
      setUser(null)
    }
  }, [token, API_URL])

  // Validate existing token on mount
  useEffect(() => {
    const validate = async () => {
      if (!token) { setLoading(false); return }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          setUser(await res.json())
        } else {
          localStorage.removeItem('access_token')
          setToken(null)
        }
      } catch {
        localStorage.removeItem('access_token')
        setToken(null)
      } finally {
        setLoading(false)
      }
    }
    validate()
  }, [token, API_URL])

  return (
    <AuthContext.Provider
      value={{ user, token, loading, isAuthenticated: !!user, authRequired, login, logout, handleCallback }}
    >
      {children}
    </AuthContext.Provider>
  )
}
