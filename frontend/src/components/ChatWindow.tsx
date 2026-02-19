import React, { useEffect, useRef } from 'react'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { Bot, Sparkles, FileText } from 'lucide-react'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  isLoading: boolean
  error: string | null
  onSend: (message: string) => void
  onStop: () => void
  onClear: () => void
  selectedDocName: string | null
  hasDocuments: boolean
}

const SUGGESTIONS = [
  'What are the main topics covered in this document?',
  'Summarize the key concepts',
  'What are the most important technical details?',
  'Explain the architecture described in these docs',
]

export function ChatWindow({
  messages,
  isLoading,
  error,
  onSend,
  onStop,
  onClear,
  selectedDocName,
  hasDocuments,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-900/60 flex items-center justify-center">
            <Bot className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-gray-100">DocChat</h1>
            <p className="text-xs text-gray-500">
              {selectedDocName ? (
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {selectedDocName}
                </span>
              ) : hasDocuments ? (
                'Searching all documents'
              ) : (
                'Upload a PDF to get started'
              )}
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-gray-600 hover:text-gray-400 transition-colors px-2 py-1 rounded"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 pb-12">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950/50 border border-indigo-900/50 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-200">Ask anything</h2>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                {hasDocuments
                  ? 'Ask questions about your uploaded documents'
                  : 'Upload a PDF from the sidebar to start chatting'}
              </p>
            </div>

            {hasDocuments && (
              <div className="flex flex-col gap-2 w-full max-w-md">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="text-left text-sm text-gray-400 px-4 py-3 rounded-xl border border-gray-700 hover:border-indigo-700 hover:text-gray-200 hover:bg-indigo-950/20 transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </>
        )}

        {error && !isLoading && (
          <div className="px-4 py-3 bg-red-950/40 border border-red-800/50 rounded-xl text-xs text-red-300">
            ⚠ {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800">
        <ChatInput
          onSend={onSend}
          onStop={onStop}
          isLoading={isLoading}
          disabled={!hasDocuments}
          placeholder={
            hasDocuments
              ? 'Ask a question about your documents...'
              : 'Upload a PDF to start chatting'
          }
        />
      </div>
    </div>
  )
}
