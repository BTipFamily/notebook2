from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from ..auth.models import User
from .schemas import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from . import service
from ..documents.models import Document
from typing import List

router = APIRouter(prefix="/workspaces", tags=["workspaces"])


@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    workspaces = service.list_workspaces(db, current_user.id)
    result = []
    for ws in workspaces:
        doc_count = db.query(Document).filter(Document.workspace_id == ws.id).count()
        ws_dict = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
        ws_dict["document_count"] = doc_count
        result.append(WorkspaceResponse(**ws_dict))
    return result


@router.post("", response_model=WorkspaceResponse)
def create_workspace(
    data: WorkspaceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = service.create_workspace(db, data, current_user.id)
    ws_dict = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
    ws_dict["document_count"] = 0
    return WorkspaceResponse(**ws_dict)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = service.get_workspace(db, workspace_id, current_user.id)
    doc_count = db.query(Document).filter(Document.workspace_id == workspace_id).count()
    ws_dict = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
    ws_dict["document_count"] = doc_count
    return WorkspaceResponse(**ws_dict)


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(
    workspace_id: int,
    data: WorkspaceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ws = service.update_workspace(db, workspace_id, data, current_user.id)
    doc_count = db.query(Document).filter(Document.workspace_id == workspace_id).count()
    ws_dict = {c.name: getattr(ws, c.name) for c in ws.__table__.columns}
    ws_dict["document_count"] = doc_count
    return WorkspaceResponse(**ws_dict)


@router.delete("/{workspace_id}")
def delete_workspace(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service.delete_workspace(db, workspace_id, current_user.id)
    return {"message": "Workspace deleted"}
