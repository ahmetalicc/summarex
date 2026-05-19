"""Public sharing endpoint — no auth required."""
from fastapi import APIRouter

from app.services.supabase_service import SupabaseService
from app.utils.exceptions import MeetingNotFoundError

router = APIRouter(tags=["sharing"])


@router.get("/shared/{token}")
async def get_public_view(token: str) -> dict:
    view = SupabaseService().get_public_meeting_view(token)
    if view is None:
        raise MeetingNotFoundError("Shared link not found or has expired")
    return view
