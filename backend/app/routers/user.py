"""User account endpoints."""
from fastapi import APIRouter, Response

from app.dependencies import CurrentUser
from app.services.supabase_service import SupabaseService
from app.utils.logging import get_logger

log = get_logger(__name__)

router = APIRouter(prefix="/user", tags=["user"])


@router.delete("/me", status_code=204)
async def delete_my_account(current_user: CurrentUser) -> Response:
    """Permanently delete the caller's account, recordings, transcripts, and summaries."""
    user_id = str(current_user["id"])
    log.info("Account deletion requested by user %s", user_id)
    SupabaseService().delete_user_account(user_id)
    return Response(status_code=204)
