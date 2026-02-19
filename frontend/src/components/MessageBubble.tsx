import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Bot, User, ChevronDown, ChevronUp, FileText } from 'lucide-react'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 h-5">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}

export function MessageBubble({ message }: Props) {
  const [showSources, setShowSources] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600' : 'bg-gray-700'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-indigo-400" />
        )}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={isUser ? 'message-user' : 'message-assistant'}>
          {message.isStreaming && message.content === '' ? (
            <TypingIndicator />
          ) : (
            <div className="prose-sm text-sm leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    const isBlock = !!(props as { 'data-inline'?: boolean })

                    if (match && !isBlock) {
                      return (
                        <SyntaxHighlighter
                          style={oneDark as Record<string, React.CSSProperties>}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{
                            borderRadius: '0.5rem',
                            fontSize: '0.75rem',
                            margin: '0.5rem 0',
                          }}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      )
                    }
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-text-bottom" />
              )}
            </div>
          )}
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setShowSources((s) => !s)}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1"
            >
              <FileText className="w-3 h-3" />
              <span>{message.sources.length} source{message.sources.length > 1 ? 's' : ''}</span>
              {showSources ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>

            {showSources && (
              <div className="space-y-2 animate-fade-in">
                {message.sources.map((src, i) => (
                  <div
                    key={i}
                    className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                      <span className="text-indigo-400 font-medium truncate">
                        {src.filename || 'Unknown'}
                      </span>
                      {src.page != null && (
                        <span className="text-gray-500 shrink-0">p. {src.page + 1}</span>
                      )}
                    </div>
                    <p className="text-gray-400 leading-relaxed line-clamp-4">
                      {src.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-gray-600">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}
