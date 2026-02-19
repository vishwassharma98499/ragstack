import React from 'react'
import { FileText, Trash2, Loader2, Tag } from 'lucide-react'
import clsx from 'clsx'
import type { Document } from '../types'

interface Props {
  documents: Document[]
  loading: boolean
  selectedDocId: string | null
  onSelect: (docId: string | null) => void
  onDelete: (docId: string) => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function DocumentList({
  documents,
  loading,
  selectedDocId,
  onSelect,
  onDelete,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    )
  }

  if (documents.length === 0) {
    return (
      <div className="px-4 py-6 text-center">
        <FileText className="w-8 h-8 text-gray-700 mx-auto mb-2" />
        <p className="text-xs text-gray-500">No documents yet</p>
        <p className="text-xs text-gray-600 mt-1">Upload a PDF above</p>
      </div>
    )
  }

  return (
    <div className="px-2 space-y-1">
      {/* "All docs" option */}
      <button
        onClick={() => onSelect(null)}
        className={clsx(
          'w-full text-left px-3 py-2 rounded-lg text-xs transition-colors',
          selectedDocId === null
            ? 'bg-indigo-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
        )}
      >
        <span className="font-medium">All documents</span>
      </button>

      <div className="h-px bg-gray-800 my-1" />

      {documents.map((doc) => (
        <div
          key={doc.doc_id}
          className={clsx(
            'group relative flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
            selectedDocId === doc.doc_id
              ? 'bg-indigo-950/60 border border-indigo-700/50'
              : 'hover:bg-gray-800 border border-transparent'
          )}
          onClick={() => onSelect(doc.doc_id)}
        >
          <FileText
            className={clsx(
              'w-4 h-4 shrink-0 mt-0.5',
              selectedDocId === doc.doc_id ? 'text-indigo-400' : 'text-gray-500'
            )}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-200 truncate leading-tight">
              {doc.filename}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-gray-500">
                {doc.chunk_count} chunks
              </span>
              <span className="text-[10px] text-gray-600">·</span>
              <span className="text-[10px] text-gray-500">
                {formatBytes(doc.file_size)}
              </span>
            </div>
            {doc.is_demo && (
              <div className="flex items-center gap-1 mt-1">
                <Tag className="w-2.5 h-2.5 text-amber-500" />
                <span className="text-[10px] text-amber-500">demo</span>
              </div>
            )}
          </div>

          {!doc.is_demo && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                if (confirm(`Delete "${doc.filename}"?`)) {
                  onDelete(doc.doc_id)
                }
              }}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-600 hover:text-red-400 transition-all rounded"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
