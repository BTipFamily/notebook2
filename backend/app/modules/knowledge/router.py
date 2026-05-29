import json
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import get_current_user
from ..auth.models import User
from ..workspaces.service import get_workspace
from ..documents.models import Document, Conversation, Message
from ..documents.vector_store import query_chunks
from .schemas import ChatRequest, ChatResponse, Citation, ReportRequest, ReportResponse
from . import ai_service

logger = logging.getLogger(__name__)

SUGGESTED_PROMPTS = [
    "Summarize all documents in this workspace",
    "What are the key risks and action items?",
    "Create an executive summary",
    "What decisions need to be made?",
    "Compare the different documents",
    "What are the main technical requirements?",
]

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["knowledge"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    workspace_id: int,
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace(db, workspace_id, current_user.id)

    # Get or create conversation
    if request.conversation_id:
        conversation = db.query(Conversation).filter(
            Conversation.id == request.conversation_id,
            Conversation.workspace_id == workspace_id,
        ).first()
        if not conversation:
            raise HTTPException(404, "Conversation not found")
    else:
        conversation = Conversation(
            workspace_id=workspace_id,
            user_id=current_user.id,
            title=request.message[:60],
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # Check documents available
    doc_count = db.query(Document).filter(
        Document.workspace_id == workspace_id, Document.status == "ready"
    ).count()

    if doc_count == 0:
        # Save user message
        user_msg = Message(conversation_id=conversation.id, role="user", content=request.message)
        db.add(user_msg)
        ai_response_text = "No documents are ready yet. Please upload and wait for documents to process before asking questions."
        ai_msg = Message(conversation_id=conversation.id, role="assistant", content=ai_response_text)
        db.add(ai_msg)
        db.commit()
        db.refresh(ai_msg)
        return ChatResponse(
            message_id=ai_msg.id,
            conversation_id=conversation.id,
            content=ai_response_text,
            suggested_prompts=SUGGESTED_PROMPTS[:3],
        )

    # Retrieve conversation history
    history_msgs = db.query(Message).filter(
        Message.conversation_id == conversation.id
    ).order_by(Message.created_at).all()
    history = [{"role": m.role, "content": m.content} for m in history_msgs[-10:]]

    # RAG: retrieve relevant chunks (12 gives enough coverage for broad queries like "summarize")
    chunks = query_chunks(workspace_id, request.message, n_results=12)

    # Save user message
    user_msg = Message(conversation_id=conversation.id, role="user", content=request.message)
    db.add(user_msg)
    db.commit()

    # Generate AI response
    if not ai_service.settings.ANTHROPIC_API_KEY:
        content = "⚠️ ANTHROPIC_API_KEY is not configured. Please add it to your .env file to enable AI features."
        citations = []
    else:
        result = await ai_service.chat(
            query=request.message,
            workspace_name=workspace.name,
            chunks=chunks,
            history=history,
        )
        content = result["content"]
        citations = result["citations"]

    # Save AI message
    ai_msg = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=content,
        citations=json.dumps(citations),
    )
    db.add(ai_msg)

    # Update conversation title on first exchange
    if len(history_msgs) == 0:
        conversation.title = request.message[:80]

    db.commit()
    db.refresh(ai_msg)

    return ChatResponse(
        message_id=ai_msg.id,
        conversation_id=conversation.id,
        content=content,
        citations=[Citation(**c) for c in citations],
        suggested_prompts=SUGGESTED_PROMPTS[:2],
    )


@router.get("/conversations")
def list_conversations(
    workspace_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_workspace(db, workspace_id, current_user.id)
    convos = db.query(Conversation).filter(
        Conversation.workspace_id == workspace_id,
        Conversation.user_id == current_user.id,
    ).order_by(Conversation.updated_at.desc()).all()
    return convos


@router.get("/conversations/{conversation_id}/messages")
def get_messages(
    workspace_id: int,
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_workspace(db, workspace_id, current_user.id)
    msgs = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at).all()
    return msgs


@router.post("/reports", response_model=ReportResponse)
async def generate_report(
    workspace_id: int,
    request: ReportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    workspace = get_workspace(db, workspace_id, current_user.id)

    if not ai_service.settings.ANTHROPIC_API_KEY:
        raise HTTPException(400, "ANTHROPIC_API_KEY not configured")

    doc_count = db.query(Document).filter(
        Document.workspace_id == workspace_id, Document.status == "ready"
    ).count()
    if doc_count == 0:
        raise HTTPException(400, "No ready documents in workspace")

    # Get broad context for reports
    report_queries = {
        "executive_summary": "executive summary key findings strategic implications decisions",
        "action_items": "action items tasks next steps todo assignments deadlines",
        "risk_analysis": "risks issues problems dependencies blockers threats",
        "meeting_prep": "agenda decisions open items stakeholders background context",
        "faq": "questions answers how what when who process requirements",
        "technical_deep_dive": "technical architecture system components API integration specifications",
    }
    query = report_queries.get(request.report_type, "key information")
    chunks = query_chunks(workspace_id, query, n_results=20)

    content = await ai_service.generate_report(
        report_type=request.report_type,
        workspace_name=workspace.name,
        all_chunks=chunks,
        custom_instructions=request.custom_instructions,
    )

    return ReportResponse(
        report_type=request.report_type,
        content=content,
        workspace_name=workspace.name,
    )
