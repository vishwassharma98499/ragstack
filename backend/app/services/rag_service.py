import logging
from typing import AsyncIterator, List, Optional, Tuple

from langchain.schema import Document

from app.core.config import settings
from app.core.llm import get_llm, build_messages
from app.core.vectorstore import similarity_search
from app.models.schemas import ChatMessage, SourceChunk

logger = logging.getLogger(__name__)


def format_context(docs: List[Document]) -> str:
    """Format retrieved documents into a context string for the prompt."""
    if not docs:
        return "No relevant context found."

    parts = []
    for i, doc in enumerate(docs, 1):
        filename = doc.metadata.get("filename", "Unknown")
        page = doc.metadata.get("page", "?")
        parts.append(
            f"[Source {i} - {filename}, page {page}]\n{doc.content if hasattr(doc, 'content') else doc.page_content}"
        )
    return "\n\n---\n\n".join(parts)


def docs_to_source_chunks(docs: List[Document]) -> List[SourceChunk]:
    """Convert LangChain Documents to API source chunks."""
    chunks = []
    for doc in docs:
        text = doc.page_content if hasattr(doc, "page_content") else str(doc)
        # Truncate for display
        display_text = text[:400] + "..." if len(text) > 400 else text
        chunks.append(
            SourceChunk(
                content=display_text,
                page=doc.metadata.get("page"),
                filename=doc.metadata.get("filename"),
            )
        )
    return chunks


async def rag_query(
    question: str,
    chat_history: List[ChatMessage],
    doc_id: Optional[str] = None,
) -> Tuple[str, List[SourceChunk]]:
    """
    Full RAG pipeline:
    1. Embed the query
    2. Retrieve top-k similar chunks
    3. Build prompt with context + history
    4. Generate answer with LLM
    5. Return answer + source chunks
    """
    # Step 1 & 2: Retrieve relevant chunks
    logger.info(f"Retrieving context for query: '{question[:80]}...'")
    retrieved_docs = await similarity_search(
        query=question,
        k=settings.RETRIEVAL_K,
        doc_id=doc_id,
    )
    logger.info(f"Retrieved {len(retrieved_docs)} chunks")

    # Step 3: Format context
    context = format_context(retrieved_docs)

    # Step 4: Build messages and call LLM
    history_dicts = [{"role": m.role, "content": m.content} for m in chat_history]
    messages = build_messages(question, context, history_dicts)

    llm = get_llm(streaming=False)
    logger.info("Calling LLM for answer generation")
    response = llm.invoke(messages)

    answer = response.content if hasattr(response, "content") else str(response)

    # Step 5: Build source chunks for response
    sources = docs_to_source_chunks(retrieved_docs)

    return answer, sources


async def rag_stream(
    question: str,
    chat_history: List[ChatMessage],
    doc_id: Optional[str] = None,
) -> AsyncIterator[str]:
    """
    Streaming version of RAG pipeline.
    Yields text tokens as they're generated.
    """
    # Retrieve context
    retrieved_docs = await similarity_search(
        query=question,
        k=settings.RETRIEVAL_K,
        doc_id=doc_id,
    )

    context = format_context(retrieved_docs)
    history_dicts = [{"role": m.role, "content": m.content} for m in chat_history]
    messages = build_messages(question, context, history_dicts)

    llm = get_llm(streaming=True)

    # Stream tokens
    async for chunk in llm.astream(messages):
        token = chunk.content if hasattr(chunk, "content") else str(chunk)
        if token:
            yield token
