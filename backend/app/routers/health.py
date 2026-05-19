from fastapi import APIRouter

from app.config import settings
from app.lib.supabase import get_service_client
from app.utils.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health():
    supabase_ok = False
    try:
        get_service_client().table("meetings").select("id").limit(1).execute()
        supabase_ok = True
    except Exception as exc:
        log.warning("Health: supabase probe failed: %s", exc)

    return {
        "status": "ok" if supabase_ok else "degraded",
        "supabase": "up" if supabase_ok else "down",
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "anthropic_configured": bool(settings.ANTHROPIC_API_KEY),
    }
