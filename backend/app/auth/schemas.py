"""
Pydantic Schemas for Authentication & User Sessions
====================================================
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class GoogleLoginRequest(BaseModel):
    """Request payload containing Google Identity Services ID token."""
    credential: str = Field(..., description="Google ID Token JWT string from GSI")

class UserResponse(BaseModel):
    """User profile response model."""
    id: str
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: Optional[str] = None
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None

class SessionUser(BaseModel):
    """Internal session user model attached to request state."""
    id: str
    google_id: str
    email: str
    name: str
    picture: Optional[str] = None
    session_token: Optional[str] = None
