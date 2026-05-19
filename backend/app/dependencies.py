"""Shared FastAPI dependencies."""
from typing import Annotated

from fastapi import Depends, Header

from app.lib.supabase import get_anon_client
from app.utils.exceptions import UnauthorizedError
from app.utils.logging import get_logger

logger = get_logger(__name__)


async def get_current_user(
    authorization: Annotated[str | None, Header()] = None,
) -> dict:
    """Verify the bearer JWT via Supabase and return {id, email}.

    Raises UnauthorizedError if header is missing/malformed or token is invalid.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Missing or malformed Authorization header")

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise UnauthorizedError("Empty bearer token")

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
