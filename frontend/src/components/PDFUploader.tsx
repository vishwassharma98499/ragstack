import React, { useCallback, useRef, useState } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import clsx from 'clsx'

interface Props {
  onUpload: (file: File) => Promise<void>
  uploading: boolean
  uploadProgress: number
  error: string | null
}

export function PDFUploader({ onUpload, uploading, uploadProgress, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)
  const [recentFile, setRecentFile] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith('.pdf')) {
        alert('Only PDF files are supported')
        return
      }
      setRecentFile(file.name)
      await onUpload(file)
    },
    [onUpload]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      e.target.value = ''
    },
    [handleFile]
  )

  return (
    <div className="p-4">
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-xl p-6 transition-all duration-200 cursor-pointer',
          dragOver
            ? 'border-indigo-400 bg-indigo-950/30'
            : 'border-gray-700 hover:border-gray-500 bg-gray-900/50',
          uploading && 'pointer-events-none opacity-75'
        )}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={handleInputChange}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          {uploading ? (
            <>
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <div className="w-full">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span className="truncate max-w-[140px]">{recentFile}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Processing & embedding...</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300">
                  Drop a PDF or <span className="text-indigo-400">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Up to 50MB</p>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 mt-3 p-3 bg-red-950/40 border border-red-800 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}
    </div>
  )
}
