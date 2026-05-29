import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.modules.auth.models import User
from app.modules.workspaces.models import Workspace
from app.modules.documents.models import Document, Conversation, Message
from app.core.security import hash_password

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def _seed_admin():
    """Create default admin user if none exists."""
    db = SessionLocal()
    try:
        if not db.query(User).first():
            admin = User(
                email=settings.ADMIN_EMAIL,
                full_name="Admin User",
                hashed_password=hash_password(settings.ADMIN_PASSWORD),
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info(f"Created default admin: {settings.ADMIN_EMAIL}")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    os.makedirs(settings.CHROMA_PERSIST_DIR, exist_ok=True)
    _seed_admin()
    logger.info(f"🚀 {settings.APP_NAME} v{settings.VERSION} started")
    yield
    # Shutdown
    logger.info("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register module routers
from app.modules.auth.router import router as auth_router
from app.modules.workspaces.router import router as workspace_router
from app.modules.documents.router import router as document_router
from app.modules.knowledge.router import router as knowledge_router
from app.modules.settings.router import router as settings_router

app.include_router(auth_router, prefix="/api")
app.include_router(workspace_router, prefix="/api")
app.include_router(document_router, prefix="/api")
app.include_router(knowledge_router, prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "version": settings.VERSION, "app": settings.APP_NAME}
