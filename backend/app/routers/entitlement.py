from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.services.supabase_service import SupabaseService

router = APIRouter(prefix="/entitlement", tags=["entitlement"])


@router.get("/me")
async def get_my_entitlement(current_user: CurrentUser) -> dict:
    """Return the caller's tier, minutes used this month, monthly limit, and reset date."""
    return SupabaseService().get_entitlement(str(current_user["id"]))
