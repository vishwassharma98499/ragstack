import os
import uuid
import logging
from pathlib import Path
from typing import List, Tuple

from langchain_community.document_loaders import PyMuPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document

from app.core.config import settings
from app.core.vectorstore import add_documents

logger = logging.getLogger(__name__)


def get_text_splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(
        chunk_size=settings.CHUNK_SIZE,
        chunk_overlap=settings.CHUNK_OVERLAP,
        length_function=len,
        separators=["\n\n", "\n", ". ", " ", ""],
    )


async def process_pdf(file_path: str, filename: str, doc_id: str) -> List[Document]:
    """
    Load a PDF, split it into chunks, embed, and store in ChromaDB.
    Returns the list of Document chunks.
    """
    logger.info(f"Processing PDF: {filename} (doc_id={doc_id})")

    # Load PDF with PyMuPDF (handles complex PDFs, tables, etc.)
    loader = PyMuPDFLoader(file_path)
    raw_docs = loader.load()

    if not raw_docs:
        raise ValueError(f"No content extracted from PDF: {filename}")

    logger.info(f"Loaded {len(raw_docs)} pages from {filename}")

    # Enrich metadata
    for doc in raw_docs:
        doc.metadata["source"] = filename
        doc.metadata["doc_id"] = doc_id
        doc.metadata["filename"] = filename

    # Split into chunks
    splitter = get_text_splitter()
    chunks = splitter.split_documents(raw_docs)

    logger.info(f"Split into {len(chunks)} chunks")

    if not chunks:
        raise ValueError(f"No chunks generated from PDF: {filename}")

    # Store in vector store
    stored_count = await add_documents(chunks, doc_id)
    logger.info(f"Stored {stored_count} chunks for doc_id={doc_id}")

    return chunks


async def save_upload(file_bytes: bytes, filename: str) -> Tuple[str, str, str]:
    """
    Save uploaded file bytes to disk.
    Returns (doc_id, file_path, safe_filename)
    """
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, safe_filename)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    logger.info(f"Saved upload: {file_path}")
    return doc_id, file_path, filename


def validate_pdf(file_bytes: bytes, filename: str):
    """Validate that the file is a valid PDF and within size limits."""
    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024

    if len(file_bytes) > max_bytes:
        raise ValueError(
            f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB, "
            f"got {len(file_bytes) / 1024 / 1024:.1f}MB"
        )

    if not filename.lower().endswith(".pdf"):
        raise ValueError("Only PDF files are supported")

    # Check PDF magic bytes
    if not file_bytes.startswith(b"%PDF"):
        raise ValueError("File does not appear to be a valid PDF")
