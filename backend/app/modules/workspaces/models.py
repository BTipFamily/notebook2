from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, Table
from sqlalchemy.orm import relationship
from app.core.database import Base

workspace_members = Table(
    "workspace_members",
    Base.metadata,
    Column("workspace_id", Integer, ForeignKey("workspaces.id", ondelete="CASCADE")),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE")),
    Column("role", String, default="viewer"),  # "owner" | "editor" | "viewer"
)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String, default="📁")
    color = Column(String, default="#6366f1")
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    owner = relationship("User", foreign_keys=[owner_id])
    documents = relationship("Document", back_populates="workspace", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="workspace", cascade="all, delete-orphan")
