import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import documents, chat, health
from app.core.config import settings
from app.core.vectorstore import init_vectorstore


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize vector store
    await init_vectorstore()
    yield
    # Shutdown: nothing needed


app = FastAPI(
    title="Local RAG Chatbot",
    description="Chat with your technical PDFs using local LLMs",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/")
async def root():
    return {"message": "RAG Chatbot API", "docs": "/docs"}
