from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class DocumentResponse(BaseModel):
    id: int
    workspace_id: int
    filename: str
    original_name: str
    file_type: str
    file_size: int
    status: str
    error_message: Optional[str] = None
    page_count: int
    chunk_count: int
    summary: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    citations: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ConversationResponse(BaseModel):
    id: int
    workspace_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
