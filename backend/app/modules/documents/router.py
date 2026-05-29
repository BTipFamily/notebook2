import os
import uuid
import asyncio
import logging
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.config import settings
from ..auth.models import User
from ..workspaces.service import get_workspace
from .models import Document
from .schemas import DocumentResponse
from . import ingestion, vector_store

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/workspaces/{workspace_id}/documents", tags=["documents"])

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "docx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "text/plain": "txt",
    "text/csv": "csv",
}


def _infer_type(filename: str, content_type: str) -> str:
    ext = Path(filename).suffix.lower().lstrip(".")
    if ext in ("pdf", "docx", "pptx", "xlsx", "xls", "txt", "csv"):
        return ext
    return ALLOWED_TYPES.get(content_type, "txt")


async def _process_document(doc_id: int, file_path: str, file_type: str, workspace_id: int):
    """Background task: parse, chunk, embed."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if not doc:
            return

        text, page_count = ingestion.extract_text(file_path, file_type)
        chunks = ingestion.chunk_text(text, doc_id, doc.original_name)

        vector_store.add_chunks(workspace_id, chunks)

        # Generate quick summary via AI if API key configured
        summary = None
        if settings.ANTHROPIC_API_KEY and len(text) > 100:
            try:
                from ..knowledge.ai_service import generate_quick_summary
                summary = await generate_quick_summary(text[:8000], doc.original_name)
            except Exception as e:
                logger.warning(f"Summary generation failed: {e}")

        doc.status = "ready"
        doc.page_count = page_count
        doc.chunk_count = len(chunks)
        doc.summary = summary
        db.commit()
    except Exception as e:
        logger.error(f"Document processing failed for {doc_id}: {e}")
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            doc.status = "error"
            doc.error_message = str(e)
            db.commit()
    finally:
        db.close()


@router.get("", response_model=List[DocumentResponse])
def list_documents(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_workspace(db, workspace_id, current_user.id)
    return db.query(Document).filter(Document.workspace_id == workspace_id).order_by(Document.created_at.desc()).all()


@router.post("", response_model=DocumentResponse)
async def upload_document(
    workspace_id: int,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_workspace(db, workspace_id, current_user.id)

    file_type = _infer_type(file.filename or "", file.content_type or "")
    content = await file.read()

    if len(content) > settings.max_file_size_bytes:
        raise HTTPException(400, f"File exceeds {settings.MAX_FILE_SIZE_MB}MB limit")

    upload_dir = Path(settings.UPLOAD_DIR) / str(workspace_id)
    upload_dir.mkdir(parents=True, exist_ok=True)
    safe_name = f"{uuid.uuid4().hex}.{file_type}"
    file_path = upload_dir / safe_name

    with open(file_path, "wb") as f:
        f.write(content)

    doc = Document(
        workspace_id=workspace_id,
        uploaded_by=current_user.id,
        filename=safe_name,
        original_name=file.filename or safe_name,
        file_type=file_type,
        file_size=len(content),
        file_path=str(file_path),
        status="processing",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    background_tasks.add_task(_process_document, doc.id, str(file_path), file_type, workspace_id)
    return doc


@router.delete("/{document_id}")
def delete_document(
    workspace_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_workspace(db, workspace_id, current_user.id)
    doc = db.query(Document).filter(
        Document.id == document_id, Document.workspace_id == workspace_id
    ).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    vector_store.delete_document_chunks(workspace_id, document_id)
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    db.delete(doc)
    db.commit()
    return {"message": "Document deleted"}
