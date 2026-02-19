import React, { useState, useRef, useEffect } from 'react'
import { Send, Square } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  onSend: (message: string) => void
  onStop?: () => void
  isLoading: boolean
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({ onSend, onStop, isLoading, disabled, placeholder }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  const handleSubmit = () => {
    const trimmed = value.trim()
    if (!trimmed || isLoading || disabled) return
    onSend(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="p-4">
      <div
        className={clsx(
          'flex items-end gap-2 bg-gray-800 border rounded-2xl px-4 py-3 transition-colors',
          disabled
            ? 'border-gray-700 opacity-60'
            : 'border-gray-600 focus-within:border-indigo-500'
        )}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={placeholder || 'Ask a question about your documents...'}
          rows={1}
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 resize-none outline-none leading-relaxed"
          style={{ maxHeight: '160px' }}
        />

        <div className="flex items-center gap-2 shrink-0 pb-0.5">
          <span className="text-[10px] text-gray-600 hidden sm:block">
            {isLoading ? '' : 'Enter ↵'}
          </span>

          {isLoading && onStop ? (
            <button
              onClick={onStop}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-red-600 hover:bg-red-500 transition-colors"
              title="Stop generating"
            >
              <Square className="w-3.5 h-3.5 text-white fill-white" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!value.trim() || isLoading || disabled}
              className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-full transition-all',
                value.trim() && !isLoading && !disabled
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-gray-700 mt-2">
        AI can make mistakes. Verify important information from source documents.
      </p>
    </div>
  )
}
