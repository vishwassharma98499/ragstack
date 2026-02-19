import React, { useState } from 'react'
import { PDFUploader } from './components/PDFUploader'
import { DocumentList } from './components/DocumentList'
import { ChatWindow } from './components/ChatWindow'
import { StatusBar } from './components/StatusBar'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { BookOpen, Menu, X } from 'lucide-react'

export default function App() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const {
    documents,
    loading,
    uploading,
    uploadProgress,
    error: uploadError,
    uploadDocument,
    deleteDocument,
  } = useDocuments()

  const { messages, isLoading, error: chatError, sendMessage, clearChat, stopStreaming } = useChat(
    selectedDocId
  )

  const selectedDoc = documents.find((d) => d.doc_id === selectedDocId) || null

  const handleUpload = async (file: File) => {
    const doc = await uploadDocument(file)
    if (doc) {
      setSelectedDocId(doc.doc_id)
    }
  }

  const handleDeleteDoc = async (docId: string) => {
    await deleteDocument(docId)
    if (selectedDocId === docId) {
      setSelectedDocId(null)
    }
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-72' : 'w-0'
        } shrink-0 transition-all duration-300 overflow-hidden flex flex-col border-r border-gray-800 bg-gray-950`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">DocChat</h1>
            <p className="text-[10px] text-gray-500">Local RAG · Mistral</p>
          </div>
        </div>

        {/* Upload zone */}
        <PDFUploader
          onUpload={handleUpload}
          uploading={uploading}
          uploadProgress={uploadProgress}
          error={uploadError}
        />

        {/* Documents */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              Documents ({documents.length})
            </span>
          </div>
          <DocumentList
            documents={documents}
            loading={loading}
            selectedDocId={selectedDocId}
            onSelect={setSelectedDocId}
            onDelete={handleDeleteDoc}
          />
        </div>

        {/* Status */}
        <StatusBar />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen((s) => !s)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-5 h-10 bg-gray-800 hover:bg-gray-700 rounded-r-lg flex items-center justify-center transition-colors"
          style={{ left: sidebarOpen ? '288px' : '0px', transition: 'left 0.3s' }}
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? (
            <X className="w-3 h-3 text-gray-400" />
          ) : (
            <Menu className="w-3 h-3 text-gray-400" />
          )}
        </button>

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={chatError}
          onSend={(msg) => sendMessage(msg, true)}
          onStop={stopStreaming}
          onClear={clearChat}
          selectedDocName={selectedDoc?.filename || null}
          hasDocuments={documents.length > 0}
        />
      </main>
    </div>
  )
}
