import axios from 'axios'
import type { Document, ChatRequest, ChatResponse, UploadResponse, HealthStatus } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min for LLM responses
})

// Documents
export const documentsApi = {
  list: async (): Promise<Document[]> => {
    const res = await api.get('/api/documents/')
    return res.data.documents
  },

  upload: async (
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<UploadResponse> => {
    const form = new FormData()
    form.append('file', file)
    const res = await api.post('/api/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100))
        }
      },
    })
    return res.data
  },

  delete: async (docId: string): Promise<void> => {
    await api.delete(`/api/documents/${docId}`)
  },
}

// Chat
export const chatApi = {
  send: async (request: ChatRequest): Promise<ChatResponse> => {
    const res = await api.post('/api/chat/', { ...request, stream: false })
    return res.data
  },

  stream: (
    request: ChatRequest,
    onToken: (token: string) => void,
    onDone: () => void,
    onError: (err: string) => void
  ): (() => void) => {
    const controller = new AbortController()

    fetch(`${BASE_URL}/api/chat/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...request, stream: true }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
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
                if (parsed.error) {
                  onError(parsed.error)
                  return
                }
                if (parsed.done) {
                  onDone()
                  return
                }
                if (parsed.token) {
                  onToken(parsed.token)
                }
              } catch {
                // skip malformed lines
              }
            }
          }
        }
        onDone()
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          onError(err.message)
        }
      })

    return () => controller.abort()
  },
}

// Health
export const healthApi = {
  check: async (): Promise<HealthStatus> => {
    const res = await api.get('/health')
    return res.data
  },
}
