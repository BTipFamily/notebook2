from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, BigInteger, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)

    filename = Column(String, nullable=False)
    original_name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)  # "pdf" | "docx" | "pptx" | "xlsx" | "txt"
    file_size = Column(BigInteger, default=0)
    file_path = Column(String, nullable=False)

    status = Column(String, default="processing")  # "processing" | "ready" | "error"
    error_message = Column(Text, nullable=True)

    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    summary = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="documents")
    uploader = relationship("User", foreign_keys=[uploaded_by])


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    workspace = relationship("Workspace", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)  # "user" | "assistant"
    content = Column(Text, nullable=False)
    citations = Column(Text, nullable=True)  # JSON array of citation objects
    created_at = Column(DateTime, server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")
