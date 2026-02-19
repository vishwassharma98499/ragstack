from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class DocumentMetadata(BaseModel):
    doc_id: str
    filename: str
    file_size: int
    chunk_count: int
    uploaded_at: datetime
    is_demo: bool = False


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
    total: int


class DocumentUploadResponse(BaseModel):
    doc_id: str
    filename: str
    chunk_count: int
    message: str


class DocumentDeleteResponse(BaseModel):
    doc_id: str
    deleted_chunks: int
    message: str


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    doc_id: Optional[str] = Field(None, description="If set, search only this document")
    chat_history: List[ChatMessage] = Field(default_factory=list)
    stream: bool = Field(False, description="Enable SSE streaming")


class SourceChunk(BaseModel):
    content: str
    page: Optional[int] = None
    filename: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceChunk]
    doc_id: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    llm_backend: str
    model: str
    embedding_model: str
    vectorstore: str
    ollama_reachable: Optional[bool] = None
