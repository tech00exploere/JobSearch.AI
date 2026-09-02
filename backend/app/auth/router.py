"""
Authentication API Router
=========================
POST /api/auth/google — Verify Google ID Token & set session cookie
GET  /api/auth/me     — Hydrate current authenticated session user
POST /api/auth/logout — Invalidate session and clear cookie
"""

import os
from fastapi import APIRouter, HTTPException, Response, Depends, status
from typing import Dict, Any
from app.auth import google, service
from app.auth.schemas import GoogleLoginRequest, UserResponse, SessionUser
from app.auth.dependencies import get_current_user_optional, get_current_user, COOKIE_SESSION_KEY

router = APIRouter()

@router.post("/auth/google", response_model=UserResponse, summary="Sign in / Register with Google")
async def login_with_google(
    payload: GoogleLoginRequest,
    response: Response
) -> UserResponse:
    """
    Verifies Google GSI ID Token, upserts candidate user in MongoDB,
    generates an application session, and attaches an HttpOnly Secure cookie.
    """
    google_data = await google.verify_google_token(payload.credential)
    if not google_data or not google_data.get("google_id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Google credential token."
        )

    # Upsert candidate user
    user = service.upsert_user(google_data)

    # Create session
    session_id = service.create_session(user)

    # Attach HttpOnly cookie with cross-site compatibility
    response.set_cookie(
        key=COOKIE_SESSION_KEY,
        value=session_id,
        httponly=True,
        max_age=30 * 24 * 60 * 60,  # 30 days
        samesite="none",
        secure=True,
        path="/"
    )

    user.session_token = session_id
    return user


@router.get("/auth/me", response_model=SessionUser, summary="Get current authenticated user")
async def get_me(
    current_user: SessionUser = Depends(get_current_user)
) -> SessionUser:
    """Returns profile info for currently logged in session user."""
    return current_user


@router.post("/auth/logout", summary="Log out of current session")
async def logout(
    response: Response,
    current_user: SessionUser = Depends(get_current_user_optional)
) -> Dict[str, str]:
    """Destroys current session and clears HttpOnly session cookie."""
    response.delete_cookie(
        key=COOKIE_SESSION_KEY,
        path="/",
        samesite="none",
        secure=True
    )
    return {"status": "success", "message": "Successfully logged out."}
