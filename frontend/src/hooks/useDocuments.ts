import { useState, useEffect, useCallback } from 'react'
import { documentsApi } from '../services/api'
import type { Document } from '../types'

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null)
      const docs = await documentsApi.list()
      setDocuments(docs)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load documents'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const uploadDocument = useCallback(async (file: File): Promise<Document | null> => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)

    try {
      const result = await documentsApi.upload(file, setUploadProgress)
      // Refresh the document list
      await fetchDocuments()

      // Find and return the new document
      const allDocs = await documentsApi.list()
      return allDocs.find((d) => d.doc_id === result.doc_id) || null
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } }; message?: string }
      const message =
        axiosError?.response?.data?.detail ||
        axiosError?.message ||
        'Upload failed'
      setError(message)
      return null
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }, [fetchDocuments])

  const deleteDocument = useCallback(async (docId: string): Promise<boolean> => {
    try {
      await documentsApi.delete(docId)
      setDocuments((prev) => prev.filter((d) => d.doc_id !== docId))
      return true
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } }; message?: string }
      const message =
        axiosError?.response?.data?.detail ||
        axiosError?.message ||
        'Delete failed'
      setError(message)
      return false
    }
  }, [])

  return {
    documents,
    loading,
    uploading,
    uploadProgress,
    error,
    uploadDocument,
    deleteDocument,
    refetch: fetchDocuments,
  }
}
