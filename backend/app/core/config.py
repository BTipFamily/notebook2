from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

# Always resolve .env relative to this file's location (backend/)
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
        env_ignore_empty=True,   # shell empty-string vars don't override .env values
    )

    APP_NAME: str = "Enterprise Knowledge Workspace"
    DEBUG: bool = False
    VERSION: str = "1.0.0"

    SECRET_KEY: str = "dev-secret-key-replace-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    ANTHROPIC_API_KEY: str = ""
    AI_MODEL: str = "claude-sonnet-4-6"

    # AI provider: "anthropic" or "metiq"
    AI_PROVIDER: str = "anthropic"

    # MetIQ (MetLife LLM) settings
    METIQ_API_KEY: str = ""
    METIQ_USE_CASE_ID: str = ""
    METIQ_ENDPOINT: str = "https://int.internal2.apis.metlife.com/channel/metiq/webapi"
    OCP_APIM_SUBSCRIPTION_KEY: str = ""

    DATABASE_URL: str = "sqlite:///./notebook.db"

    UPLOAD_DIR: str = "./uploads"
    MAX_FILE_SIZE_MB: int = 50

    CHROMA_PERSIST_DIR: str = "./chroma_db"

    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    ADMIN_EMAIL: str = "admin@company.com"
    ADMIN_PASSWORD: str = "changeme123"

    @property
    def allowed_origins_list(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024


settings = Settings()
