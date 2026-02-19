import os
import logging
from typing import List, Optional

import chromadb
from chromadb.config import Settings as ChromaSettings
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain.schema import Document

from app.core.config import settings

logger = logging.getLogger(__name__)

# Global singletons
_embeddings: Optional[HuggingFaceEmbeddings] = None
_vectorstore: Optional[Chroma] = None
_chroma_client: Optional[chromadb.PersistentClient] = None


async def init_vectorstore():
    """Initialize embeddings and ChromaDB on startup."""
    global _embeddings, _vectorstore, _chroma_client

    logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL}")
    _embeddings = HuggingFaceEmbeddings(
        model_name=settings.EMBEDDING_MODEL,
        model_kwargs={"device": "cpu"},
        encode_kwargs={"normalize_embeddings": True},
    )

    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    _chroma_client = chromadb.PersistentClient(
        path=settings.CHROMA_PERSIST_DIR,
        settings=ChromaSettings(anonymized_telemetry=False),
    )

    _vectorstore = Chroma(
        client=_chroma_client,
        collection_name=settings.CHROMA_COLLECTION_NAME,
        embedding_function=_embeddings,
    )

    logger.info("Vector store initialized successfully")


def get_embeddings() -> HuggingFaceEmbeddings:
    if _embeddings is None:
        raise RuntimeError("Embeddings not initialized. Call init_vectorstore() first.")
    return _embeddings


def get_vectorstore() -> Chroma:
    if _vectorstore is None:
        raise RuntimeError("Vector store not initialized. Call init_vectorstore() first.")
    return _vectorstore


def get_chroma_client() -> chromadb.PersistentClient:
    if _chroma_client is None:
        raise RuntimeError("Chroma client not initialized.")
    return _chroma_client


async def add_documents(documents: List[Document], doc_id: str) -> int:
    """Add documents to the vector store with metadata."""
    vs = get_vectorstore()

    # Tag each chunk with the document ID for filtering/deletion
    for doc in documents:
        doc.metadata["doc_id"] = doc_id

    vs.add_documents(documents)
    return len(documents)


async def delete_document(doc_id: str) -> int:
    """Delete all chunks for a given document ID."""
    client = get_chroma_client()
    collection = client.get_collection(settings.CHROMA_COLLECTION_NAME)

    results = collection.get(where={"doc_id": doc_id})
    ids_to_delete = results.get("ids", [])

    if ids_to_delete:
        collection.delete(ids=ids_to_delete)

    return len(ids_to_delete)


async def similarity_search(query: str, k: int = None, doc_id: str = None) -> List[Document]:
    """Search for similar documents, optionally filtered by doc_id."""
    vs = get_vectorstore()
    k = k or settings.RETRIEVAL_K

    if doc_id:
        results = vs.similarity_search(query, k=k, filter={"doc_id": doc_id})
    else:
        results = vs.similarity_search(query, k=k)

    return results


async def get_document_chunk_count(doc_id: str) -> int:
    """Get the number of chunks stored for a document."""
    client = get_chroma_client()
    try:
        collection = client.get_collection(settings.CHROMA_COLLECTION_NAME)
        results = collection.get(where={"doc_id": doc_id})
        return len(results.get("ids", []))
    except Exception:
        return 0
