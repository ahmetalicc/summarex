from fastapi import Header, HTTPException, status


async def get_current_user(authorization: str | None = Header(default=None)) -> dict:
    """Stub: Backend Agent will implement Supabase JWT verification here.

    Expected final behaviour: extract the Bearer token from the Authorization
    header, verify it against Supabase, and return the decoded user payload.
    Raises HTTP 401 if the token is missing or invalid.
    """
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing auth header",
        )
    # Placeholder shape — Backend Agent replaces this with real JWT validation.
    return {"id": "stub-user-id", "email": "stub@example.com"}
