import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

from app.core.config import settings
from app.models.schemas import DocumentMetadata

logger = logging.getLogger(__name__)

REGISTRY_FILE = os.path.join(settings.UPLOAD_DIR, "document_registry.json")


def _load_registry() -> Dict:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    if not os.path.exists(REGISTRY_FILE):
        return {}
    try:
        with open(REGISTRY_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}


def _save_registry(registry: Dict):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(REGISTRY_FILE, "w") as f:
        json.dump(registry, f, indent=2, default=str)


def register_document(
    doc_id: str,
    filename: str,
    file_size: int,
    chunk_count: int,
    is_demo: bool = False,
):
    registry = _load_registry()
    registry[doc_id] = {
        "doc_id": doc_id,
        "filename": filename,
        "file_size": file_size,
        "chunk_count": chunk_count,
        "uploaded_at": datetime.utcnow().isoformat(),
        "is_demo": is_demo,
    }
    _save_registry(registry)
    logger.info(f"Registered document: {doc_id} ({filename})")


def get_document(doc_id: str) -> Optional[DocumentMetadata]:
    registry = _load_registry()
    entry = registry.get(doc_id)
    if not entry:
        return None
    return DocumentMetadata(**entry)


def list_documents() -> List[DocumentMetadata]:
    registry = _load_registry()
    docs = []
    for entry in registry.values():
        try:
            docs.append(DocumentMetadata(**entry))
        except Exception as e:
            logger.warning(f"Skipping malformed registry entry: {e}")
    # Sort by upload time, newest first
    docs.sort(key=lambda d: d.uploaded_at, reverse=True)
    return docs


def deregister_document(doc_id: str) -> bool:
    registry = _load_registry()
    if doc_id not in registry:
        return False
    del registry[doc_id]
    _save_registry(registry)
    logger.info(f"Deregistered document: {doc_id}")
    return True
