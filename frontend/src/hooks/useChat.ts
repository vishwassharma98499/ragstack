import { useState, useCallback, useRef } from 'react'
import { chatApi } from '../services/api'
import type { ChatMessage, SourceChunk } from '../types'

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function useChat(docId?: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<(() => void) | null>(null)

  const sendMessage = useCallback(
    async (question: string, useStreaming = true) => {
      if (!question.trim() || isLoading) return

      setError(null)

      // Add user message
      const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: question,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsLoading(true)

      // Build history for API (exclude the just-added user message - it's the current question)
      const history = messages.map((m) => ({ role: m.role, content: m.content }))

      if (useStreaming) {
        // Add placeholder assistant message
        const assistantId = generateId()
        const assistantMsg: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        }
        setMessages((prev) => [...prev, assistantMsg])

        abortRef.current = chatApi.stream(
          { question, doc_id: docId, chat_history: history },
          (token) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + token } : m
              )
            )
          },
          () => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            )
            setIsLoading(false)
          },
          (err) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: `Error: ${err}`, isStreaming: false }
                  : m
              )
            )
            setIsLoading(false)
            setError(err)
          }
        )
      } else {
        // Non-streaming fallback
        try {
          const response = await chatApi.send({
            question,
            doc_id: docId,
            chat_history: history,
          })

          const assistantMsg: ChatMessage = {
            id: generateId(),
            role: 'assistant',
            content: response.answer,
            sources: response.sources,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMsg])
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Chat request failed'
          setError(message)
        } finally {
          setIsLoading(false)
        }
      }
    },
    [messages, docId, isLoading]
  )

  const clearChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setMessages([])
    setError(null)
    setIsLoading(false)
  }, [])

  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    setIsLoading(false)
    setMessages((prev) =>
      prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m))
    )
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
    stopStreaming,
  }
}
