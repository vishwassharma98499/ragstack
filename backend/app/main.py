import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.api import documents, chat, health, auth
from app.core.config import settings
from app.core.vectorstore import init_vectorstore


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_vectorstore()
    yield


app = FastAPI(
    title="RAGStack",
    description="Local RAG Chatbot with Azure AD SSO",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth routes (public — no JWT needed to hit /auth/token)
app.include_router(auth.router, prefix="/auth", tags=["auth"])

# App routes
app.include_router(health.router, tags=["health"])
app.include_router(documents.router, prefix="/api/documents", tags=["documents"])
app.include_router(chat.router, prefix="/api/chat", tags=["chat"])


@app.get("/")
async def root():
    return {
        "message": "RAGStack API",
        "auth_required": settings.AUTH_REQUIRED,
        "docs": "/docs",
    }
