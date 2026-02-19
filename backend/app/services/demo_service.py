import os
import logging
from pathlib import Path

from app.core.config import settings
from app.services.pdf_service import process_pdf
from app.services.document_registry import register_document, get_document

logger = logging.getLogger(__name__)

DEMO_DOCS = [
    {
        "doc_id": "demo-attention-paper",
        "filename": "attention_is_all_you_need.pdf",
        "description": "Attention Is All You Need - Transformer architecture paper",
    },
    {
        "doc_id": "demo-docker-docs",
        "filename": "docker_getting_started.pdf",
        "description": "Docker Getting Started Guide",
    },
]


async def load_demo_documents():
    """
    Load demo PDFs from the demo_pdfs directory into ChromaDB.
    Only loads documents that haven't been loaded yet.
    """
    if not settings.DEMO_MODE:
        return

    logger.info("Demo mode enabled. Loading demo documents...")
    demo_dir = Path(settings.DEMO_PDF_DIR)

    if not demo_dir.exists():
        logger.warning(f"Demo PDF directory not found: {demo_dir}")
        return

    for demo in DEMO_DOCS:
        doc_id = demo["doc_id"]
        filename = demo["filename"]
        file_path = demo_dir / filename

        # Check if already loaded
        if get_document(doc_id):
            logger.info(f"Demo doc already loaded: {filename}")
            continue

        if not file_path.exists():
            logger.warning(f"Demo PDF not found: {file_path}")
            continue

        try:
            file_size = os.path.getsize(file_path)
            chunks = await process_pdf(str(file_path), filename, doc_id)
            register_document(
                doc_id=doc_id,
                filename=filename,
                file_size=file_size,
                chunk_count=len(chunks),
                is_demo=True,
            )
            logger.info(f"Loaded demo document: {filename} ({len(chunks)} chunks)")
        except Exception as e:
            logger.error(f"Failed to load demo document {filename}: {e}")
