from sqlalchemy.orm import Session
from fastapi import HTTPException
from .models import Workspace
from .schemas import WorkspaceCreate, WorkspaceUpdate
from ..documents.models import Document


def list_workspaces(db: Session, user_id: int) -> list[Workspace]:
    return db.query(Workspace).filter(Workspace.owner_id == user_id).order_by(Workspace.updated_at.desc()).all()


def get_workspace(db: Session, workspace_id: int, user_id: int) -> Workspace:
    ws = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.owner_id == user_id,
    ).first()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


def create_workspace(db: Session, data: WorkspaceCreate, user_id: int) -> Workspace:
    ws = Workspace(owner_id=user_id, **data.model_dump())
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


def update_workspace(db: Session, workspace_id: int, data: WorkspaceUpdate, user_id: int) -> Workspace:
    ws = get_workspace(db, workspace_id, user_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ws, field, value)
    db.commit()
    db.refresh(ws)
    return ws


def delete_workspace(db: Session, workspace_id: int, user_id: int) -> None:
    ws = get_workspace(db, workspace_id, user_id)
    db.delete(ws)
    db.commit()


def get_workspace_with_count(db: Session, workspace_id: int, user_id: int) -> dict:
    ws = get_workspace(db, workspace_id, user_id)
    doc_count = db.query(Document).filter(Document.workspace_id == workspace_id).count()
    return {**ws.__dict__, "document_count": doc_count}
