from pydantic import BaseModel
from typing import List, Optional, Any


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[int] = None


class Citation(BaseModel):
    document_name: str
    document_id: Optional[int] = None


class ChatResponse(BaseModel):
    message_id: int
    conversation_id: int
    content: str
    citations: List[Citation] = []
    suggested_prompts: List[str] = []


class ReportRequest(BaseModel):
    report_type: str  # executive_summary | action_items | risk_analysis | meeting_prep | faq | technical_deep_dive
    custom_instructions: Optional[str] = None


class ReportResponse(BaseModel):
    report_type: str
    content: str
    workspace_name: str
