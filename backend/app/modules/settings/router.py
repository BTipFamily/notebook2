"""Admin-only API for reading and switching the active AI provider at runtime."""

from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import settings
from app.core.dependencies import require_admin
from app.modules.auth.models import User

router = APIRouter(prefix="/settings", tags=["settings"])

# Registry of known providers — add new entries here to expose them in the UI.
PROVIDERS: List[dict] = [
    {
        "id": "anthropic",
        "label": "Anthropic Claude",
        "description": "Claude Sonnet via Anthropic API",
        "requires": ["ANTHROPIC_API_KEY"],
    },
    {
        "id": "metiq",
        "label": "MetLife MetIQ",
        "description": "MetIQ LLM via MetLife internal API",
        "requires": ["METIQ_API_KEY", "METIQ_USE_CASE_ID", "OCP_APIM_SUBSCRIPTION_KEY"],
    },
]

_ENV_FILE = Path(__file__).resolve().parent.parent.parent.parent / ".env"


class ProviderInfo(BaseModel):
    id: str
    label: str
    description: str
    requires: List[str]
    configured: bool


class AIProviderStatus(BaseModel):
    current: str
    providers: List[ProviderInfo]


class SetProviderRequest(BaseModel):
    provider: str


def _is_configured(provider: dict) -> bool:
    """Return True if all required settings fields are non-empty."""
    for key in provider["requires"]:
        if not getattr(settings, key, ""):
            return False
    return True


def _update_env_file(key: str, value: str) -> None:
    """Update a single key=value line in the .env file, adding it if absent."""
    if not _ENV_FILE.exists():
        _ENV_FILE.write_text(f"{key}={value}\n", encoding="utf-8")
        return

    lines = _ENV_FILE.read_text(encoding="utf-8").splitlines(keepends=True)
    found = False
    new_lines = []
    for line in lines:
        if line.startswith(f"{key}=") or line.startswith(f"{key} ="):
            new_lines.append(f"{key}={value}\n")
            found = True
        else:
            new_lines.append(line)
    if not found:
        new_lines.append(f"{key}={value}\n")
    _ENV_FILE.write_text("".join(new_lines), encoding="utf-8")


@router.get("/ai-provider", response_model=AIProviderStatus)
def get_ai_provider(_admin: User = Depends(require_admin)):
    """Return the current AI provider and the full provider registry."""
    provider_list = [
        ProviderInfo(
            id=p["id"],
            label=p["label"],
            description=p["description"],
            requires=p["requires"],
            configured=_is_configured(p),
        )
        for p in PROVIDERS
    ]
    return AIProviderStatus(current=settings.AI_PROVIDER, providers=provider_list)


@router.put("/ai-provider", response_model=AIProviderStatus)
def set_ai_provider(
    body: SetProviderRequest,
    _admin: User = Depends(require_admin),
):
    """Switch the active AI provider. Persists to .env and updates the live setting."""
    valid_ids = {p["id"] for p in PROVIDERS}
    if body.provider not in valid_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown provider '{body.provider}'. Valid options: {sorted(valid_ids)}",
        )

    # Update live setting so the change takes effect immediately (no restart needed)
    settings.AI_PROVIDER = body.provider

    # Persist to .env so the choice survives a restart
    _update_env_file("AI_PROVIDER", body.provider)

    return get_ai_provider(_admin)
