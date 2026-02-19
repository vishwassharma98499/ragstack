import logging
from fastapi import APIRouter, File, UploadFile, HTTPException, Depends

from app.core.config import settings
from app.core.auth import require_auth, AuthenticatedUser
from app.core.vectorstore import delete_document
from app.services.pdf_service import process_pdf, save_upload, validate_pdf
from app.services.document_registry import (
    register_document, list_documents, get_document, deregister_document,
)
from app.models.schemas import (
    DocumentListResponse, DocumentUploadResponse, DocumentDeleteResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    current_user=Depends(require_auth),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_bytes = await file.read()

    try:
        validate_pdf(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        doc_id, file_path, filename = await save_upload(file_bytes, file.filename)
        chunks = await process_pdf(file_path, filename, doc_id)
        register_document(
            doc_id=doc_id,
            filename=filename,
            file_size=len(file_bytes),
            chunk_count=len(chunks),
        )
        return DocumentUploadResponse(
            doc_id=doc_id,
            filename=filename,
            chunk_count=len(chunks),
            message=f"Successfully processed {filename} into {len(chunks)} chunks",
        )
    except Exception as e:
        logger.error(f"Failed to process PDF: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")


@router.get("/", response_model=DocumentListResponse)
async def list_all_documents(current_user=Depends(require_auth)):
    docs = list_documents()
    return DocumentListResponse(documents=docs, total=len(docs))


@router.get("/{doc_id}")
async def get_document_info(doc_id: str, current_user=Depends(require_auth)):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    return doc


@router.delete("/{doc_id}", response_model=DocumentDeleteResponse)
async def delete_document_endpoint(doc_id: str, current_user=Depends(require_auth)):
    doc = get_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail=f"Document {doc_id} not found")
    if doc.is_demo:
        raise HTTPException(status_code=403, detail="Cannot delete demo documents")
    try:
        deleted_chunks = await delete_document(doc_id)
        deregister_document(doc_id)
        return DocumentDeleteResponse(
            doc_id=doc_id,
            deleted_chunks=deleted_chunks,
            message=f"Deleted document and {deleted_chunks} chunks",
        )
    except Exception as e:
        logger.error(f"Failed to delete document {doc_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")
