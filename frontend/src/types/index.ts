export interface Document {
  doc_id: string
  filename: string
  file_size: number
  chunk_count: number
  uploaded_at: string
  is_demo: boolean
}

export interface SourceChunk {
  content: string
  page: number | null
  filename: string | null
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceChunk[]
  timestamp: Date
  isStreaming?: boolean
}

export interface ChatRequest {
  question: string
  doc_id?: string | null
  chat_history: { role: string; content: string }[]
  stream?: boolean
}

export interface ChatResponse {
  answer: string
  sources: SourceChunk[]
  doc_id?: string | null
}

export interface HealthStatus {
  status: string
  llm_backend: string
  model: string
  embedding_model: string
  vectorstore: string
  ollama_reachable: boolean | null
}

export interface UploadResponse {
  doc_id: string
  filename: string
  chunk_count: number
  message: string
}
