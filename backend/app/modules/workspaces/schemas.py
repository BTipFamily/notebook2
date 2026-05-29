from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None
    icon: str = "📁"
    color: str = "#6366f1"


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    icon: str
    color: str
    owner_id: int
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
