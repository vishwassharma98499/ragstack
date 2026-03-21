import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import { PDFUploader } from './components/PDFUploader'
import { DocumentList } from './components/DocumentList'
import { ChatWindow } from './components/ChatWindow'
import { StatusBar } from './components/StatusBar'
import { useDocuments } from './hooks/useDocuments'
import { useChat } from './hooks/useChat'
import { useAuth } from './contexts/AuthContext'
import { BookOpen, Menu, X, LogOut, User } from 'lucide-react'

function ChatApp() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout, isAuthenticated, authRequired } = useAuth()

  const {
    documents, loading, uploading, uploadProgress,
    error: uploadError, uploadDocument, deleteDocument,
  } = useDocuments()

  const {
    messages, isLoading, error: chatError,
    sendMessage, clearChat, stopStreaming,
  } = useChat(selectedDocId)

  const selectedDoc = documents.find(d => d.doc_id === selectedDocId) || null

  const handleUpload = async (file: File) => {
    const doc = await uploadDocument(file)
    if (doc) setSelectedDocId(doc.doc_id)
  }

  const handleDeleteDoc = async (docId: string) => {
    await deleteDocument(docId)
    if (selectedDocId === docId) setSelectedDocId(null)
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-72' : 'w-0'} shrink-0 transition-all duration-300 overflow-hidden flex flex-col border-r border-gray-800 bg-gray-950`}>
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-gray-800">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white">RAGStack</h1>
            <p className="text-[10px] text-gray-500">Local RAG · Private</p>
          </div>
          {/* User avatar + logout */}
          {isAuthenticated && authRequired && (
            <div className="flex items-center gap-1">
              <div className="w-7 h-7 rounded-full bg-indigo-900 border border-indigo-700 flex items-center justify-center" title={user?.name}>
                <span className="text-xs font-semibold text-indigo-300">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <button onClick={logout} title="Sign out" className="p-1 text-gray-600 hover:text-red-400 transition-colors rounded">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Upload */}
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

        <StatusBar />
      </aside>

      {/* Sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(s => !s)}
        className="absolute z-10 w-5 h-10 bg-gray-800 hover:bg-gray-700 rounded-r-lg flex items-center justify-center transition-all"
        style={{ left: sidebarOpen ? '288px' : '0px', top: '50%', transform: 'translateY(-50%)', transition: 'left 0.3s' }}
      >
        {sidebarOpen ? <X className="w-3 h-3 text-gray-400" /> : <Menu className="w-3 h-3 text-gray-400" />}
      </button>

      {/* Main chat */}
      <main className="flex-1 flex flex-col min-w-0">
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          error={chatError}
          onSend={msg => sendMessage(msg, true)}
          onStop={stopStreaming}
          onClear={clearChat}
          selectedDocName={selectedDoc?.filename || null}
          hasDocuments={documents.length > 0}
        />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <ChatApp />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
