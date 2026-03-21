const IS_DEMO = !import.meta.env.VITE_API_URL && import.meta.env.MODE === 'production'

const DEMO_DOCUMENTS = [
  { doc_id: '1', filename: 'Kubernetes Best Practices.pdf', page_count: 24, chunk_count: 48, upload_timestamp: '2025-12-01T10:00:00Z', file_size: 2400000 },
  { doc_id: '2', filename: 'AWS Well-Architected Framework.pdf', page_count: 36, chunk_count: 72, upload_timestamp: '2025-12-05T14:30:00Z', file_size: 3600000 },
  { doc_id: '3', filename: 'Terraform Module Design.pdf', page_count: 18, chunk_count: 34, upload_timestamp: '2025-12-10T09:15:00Z', file_size: 1800000 },
]

const DEMO_RESPONSES: Record<string, string> = {
  kubernetes: 'Based on your documents, Kubernetes best practices include: using resource limits on all containers, implementing pod disruption budgets for high availability, using namespaces for multi-tenant isolation, and enabling RBAC for access control. The document recommends starting with managed services like EKS before self-managed clusters.\n\n**Sources:** Kubernetes Best Practices.pdf — Section 2.1: Resource Management',
  terraform: 'According to the Terraform Module Design document, modules should follow a standard structure with variables.tf, main.tf, and outputs.tf. Key principles include: using variable validation blocks, tagging all resources consistently, storing state in S3 with DynamoDB locking, and keeping modules small and composable.\n\n**Sources:** Terraform Module Design.pdf — Section 3: Module Structure',
  aws: 'The AWS Well-Architected Framework defines five pillars: Operational Excellence, Security, Reliability, Performance Efficiency, and Cost Optimization. Your document emphasizes that security should never be traded for convenience, and recommends enabling CloudTrail, using IAM roles instead of long-lived keys, and encrypting data at rest.\n\n**Sources:** AWS Well-Architected Framework.pdf — Pillar 2: Security',
  default: 'Based on the uploaded documents, I can help with questions about Kubernetes operations, AWS architecture patterns, and Terraform infrastructure design. Try asking something specific like "What are Kubernetes resource limit best practices?" or "How should I structure Terraform modules?"',
}
import axios from 'axios'
import type { Document, ChatRequest, ChatResponse, UploadResponse, HealthStatus } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000,
})

// Inject auth token on every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const documentsApi = {
  list: async (): Promise<Document[]> => {
    if (IS_DEMO) return DEMO_DOCUMENTS as any
    const res = await api.get('/api/documents/')
    return res.data.documents
  },
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<UploadResponse> => {
    if (IS_DEMO) {
      if (onProgress) { onProgress(50); await new Promise(r => setTimeout(r, 500)); onProgress(100) }
      return { doc_id: Date.now().toString(), filename: file.name, page_count: 10, chunk_count: 20 } as any
    }
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/api/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => { if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100)) },
    })
    return res.data
  },
  delete: async (docId: string): Promise<void> => {
    if (IS_DEMO) return
    await api.delete(`/api/documents/${docId}`)
  },
}

export const chatApi = {
  send: async (request: ChatRequest): Promise<ChatResponse> => {
    if (IS_DEMO) {
      const key = Object.keys(DEMO_RESPONSES).find(k => request.message.toLowerCase().includes(k)) || 'default'
      return { answer: DEMO_RESPONSES[key], sources: [] } as any
    }
    const res = await api.post('/api/chat/', { ...request, stream: false })
    return res.data
  },
  stream: (
    request: ChatRequest,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): (() => void) => {
    if (IS_DEMO) {
      let cancelled = false
      const key = Object.keys(DEMO_RESPONSES).find(k => request.message.toLowerCase().includes(k)) || 'default'
      const words = DEMO_RESPONSES[key].split(' ')
      ;(async () => {
        for (const word of words) {
          if (cancelled) return
          onToken(word + ' ')
          await new Promise(r => setTimeout(r, 30 + Math.random() * 50))
        }
        onDone()
      })()
      return () => { cancelled = true }
    }
    const controller = new AbortController()
    const token = localStorage.getItem('access_token')

    fetch(`${BASE_URL}/api/chat/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
    })
      .then(async response => {
        if (response.status === 401) {
          localStorage.removeItem('access_token')
          window.location.href = '/login'
          return
        }
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const reader = response.body?.getReader()
        if (!reader) throw new Error('No response body')
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.error) { onError(parsed.error); return }
                if (parsed.done) { onDone(); return }
                if (parsed.token) onToken(parsed.token)
              } catch { /* skip */ }
            }
          }
        }
        onDone()
      })
      .catch(err => { if (err.name !== 'AbortError') onError(err.message) })

    return () => controller.abort()
  },
}

export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    if (IS_DEMO) return { status: 'demo', ollama: false, chroma: false } as any
    const res = await api.get('/health')
    return res.data
  },
}
