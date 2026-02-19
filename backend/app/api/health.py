import logging
import httpx
from fastapi import APIRouter

from app.core.config import settings
from app.models.schemas import HealthResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint - tests LLM connectivity."""
    ollama_reachable = None

    if not settings.USE_GROQ:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
                ollama_reachable = resp.status_code == 200
        except Exception:
            ollama_reachable = False

    return HealthResponse(
        status="healthy",
        llm_backend="groq" if settings.USE_GROQ else "ollama",
        model=settings.GROQ_MODEL if settings.USE_GROQ else settings.OLLAMA_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
        vectorstore="chromadb",
        ollama_reachable=ollama_reachable,
    )
