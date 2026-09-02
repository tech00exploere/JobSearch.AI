"""
FastAPI Authentication Dependencies
===================================
Dependency for protecting endpoints with session cookies.
"""

from fastapi import Request, HTTPException, status, Depends
from typing import Optional
from app.auth.schemas import SessionUser
from app.auth import service

COOKIE_SESSION_KEY = "jobsearch_session"

async def get_current_user_optional(request: Request) -> Optional[SessionUser]:
    """
    Extracts session user from HttpOnly cookie if present.
    Returns None if unauthenticated.
    """
    session_id = request.cookies.get(COOKIE_SESSION_KEY)
    if not session_id:
        # Also check Authorization header for flexibility
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            session_id = auth_header[7:].strip()

    if not session_id:
        return None

    return service.get_user_from_session(session_id)


async def get_current_user(
    user: Optional[SessionUser] = Depends(get_current_user_optional)
) -> SessionUser:
    """
    Requires an authenticated user.
    Raises HTTP 401 Unauthorized if unauthenticated.
    """
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in with Google.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user
