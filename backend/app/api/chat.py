import json
import logging
from typing import AsyncIterator

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.services.rag_service import rag_query, rag_stream
from app.services.document_registry import get_document
from app.models.schemas import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Ask a question against uploaded documents.
    Returns the answer and source chunks used for context.
    """
    # Validate doc_id if provided
    if request.doc_id:
        doc = get_document(request.doc_id)
        if not doc:
            raise HTTPException(
                status_code=404, detail=f"Document {request.doc_id} not found"
            )

    if request.stream:
        # Return SSE stream
        return StreamingResponse(
            _stream_response(request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    try:
        answer, sources = await rag_query(
            question=request.question,
            chat_history=request.chat_history,
            doc_id=request.doc_id,
        )

        return ChatResponse(
            answer=answer,
            sources=sources,
            doc_id=request.doc_id,
        )

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


async def _stream_response(request: ChatRequest) -> AsyncIterator[str]:
    """Generator for SSE streaming response."""
    try:
        async for token in rag_stream(
            question=request.question,
            chat_history=request.chat_history,
            doc_id=request.doc_id,
        ):
            data = json.dumps({"token": token, "done": False})
            yield f"data: {data}\n\n"

        # Send done signal
        yield f"data: {json.dumps({'token': '', 'done': True})}\n\n"

    except Exception as e:
        logger.error(f"Streaming error: {e}", exc_info=True)
        error_data = json.dumps({"error": str(e), "done": True})
        yield f"data: {error_data}\n\n"
