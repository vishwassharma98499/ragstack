import React, { useEffect, useState } from 'react'
import { healthApi } from '../services/api'
import type { HealthStatus } from '../types'
import { Cpu, Database, Wifi, WifiOff } from 'lucide-react'
import clsx from 'clsx'

export function StatusBar() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const h = await healthApi.check()
        setHealth(h)
        setError(false)
      } catch {
        setError(true)
      }
    }
    check()
    const interval = setInterval(check, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const isOnline = !error && health?.status === 'healthy'
  const ollamaOk = health?.ollama_reachable !== false

  return (
    <div className="px-4 py-3 border-t border-gray-800 bg-gray-950">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Connection status */}
        <div className="flex items-center gap-1.5">
          {isOnline ? (
            <Wifi className="w-3 h-3 text-green-500" />
          ) : (
            <WifiOff className="w-3 h-3 text-red-500" />
          )}
          <span className={clsx('text-[10px]', isOnline ? 'text-green-500' : 'text-red-400')}>
            {isOnline ? 'Connected' : 'Offline'}
          </span>
        </div>

        {health && (
          <>
            <div className="h-3 w-px bg-gray-700" />

            {/* LLM */}
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">
                {health.llm_backend === 'groq' ? '☁ Groq' : '⚡ Ollama'} · {health.model}
              </span>
              {health.llm_backend === 'ollama' && (
                <span
                  className={clsx(
                    'w-1.5 h-1.5 rounded-full',
                    ollamaOk ? 'bg-green-500' : 'bg-red-500'
                  )}
                />
              )}
            </div>

            <div className="h-3 w-px bg-gray-700" />

            {/* Vector store */}
            <div className="flex items-center gap-1.5">
              <Database className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] text-gray-500">ChromaDB</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
