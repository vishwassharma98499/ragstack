import logging
from typing import AsyncIterator, List
from langchain.schema import BaseMessage, HumanMessage, SystemMessage, AIMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def get_llm(streaming: bool = False):
    """Return the appropriate LLM based on config (Ollama local or Groq cloud)."""
    if settings.USE_GROQ:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required when USE_GROQ=true")

        from langchain_groq import ChatGroq

        logger.info(f"Using Groq LLM: {settings.GROQ_MODEL}")
        return ChatGroq(
            api_key=settings.GROQ_API_KEY,
            model_name=settings.GROQ_MODEL,
            temperature=0.1,
            streaming=streaming,
        )
    else:
        from langchain_ollama import ChatOllama

        logger.info(f"Using Ollama LLM: {settings.OLLAMA_MODEL} at {settings.OLLAMA_BASE_URL}")
        return ChatOllama(
            base_url=settings.OLLAMA_BASE_URL,
            model=settings.OLLAMA_MODEL,
            temperature=0.1,
            streaming=streaming,
        )


RAG_SYSTEM_PROMPT = """You are a helpful technical assistant that answers questions based on the provided document context.

Guidelines:
- Answer ONLY based on the provided context. Do not use outside knowledge.
- If the answer is not in the context, say "I couldn't find information about that in the uploaded documents."
- Be precise and cite relevant parts of the context in your answer.
- For technical topics, use clear explanations with examples when present in the context.
- Keep answers concise but complete.

Context from documents:
{context}"""


def build_messages(query: str, context: str, chat_history: List[dict]) -> List[BaseMessage]:
    """Build message list for the LLM including chat history."""
    messages: List[BaseMessage] = []

    # System message with injected context
    messages.append(SystemMessage(content=RAG_SYSTEM_PROMPT.format(context=context)))

    # Inject chat history (last N turns)
    for turn in chat_history[-6:]:  # Keep last 6 turns to stay within context window
        role = turn.get("role", "")
        content = turn.get("content", "")
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    # Current question
    messages.append(HumanMessage(content=query))

    return messages
