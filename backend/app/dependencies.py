"""Shared FastAPI dependencies."""
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.lib.supabase import get_anon_client
from app.utils.exceptions import UnauthorizedError
from app.utils.logging import get_logger

logger = get_logger(__name__)

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)] = None,
) -> dict:
    """Verify the bearer JWT via Supabase and return {id, email}.

    Raises UnauthorizedError if credentials are missing or the token is invalid.
    """
    if not credentials or not credentials.credentials:
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = credentials.credentials
    try:
        response = get_anon_client().auth.get_user(token)
    except Exception as exc:  # supabase SDK raises various subclasses
        logger.warning("Supabase auth.get_user failed: %s", exc)
        raise UnauthorizedError("Invalid or expired token") from exc

    user = getattr(response, "user", None)
    if user is None or not getattr(user, "id", None):
        raise UnauthorizedError("Invalid or expired token")

    return {"id": user.id, "email": getattr(user, "email", None)}


CurrentUser = Annotated[dict, Depends(get_current_user)]
