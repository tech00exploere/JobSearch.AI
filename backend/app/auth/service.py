"""
User CRUD & Session Management Service
======================================
Manages candidate users in MongoDB ('users' collection)
and handles session token generation & validation.
"""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from app.db.mongo_client import get_database
from app.auth.schemas import UserResponse, SessionUser

# In-memory session store (session_id -> SessionUser) for fallback/fast lookup
SESSIONS: Dict[str, SessionUser] = {}
USERS_MEMORY: Dict[str, Dict[str, Any]] = {}


def upsert_user(google_data: Dict[str, Any]) -> UserResponse:
    """
    Finds or creates a candidate user in MongoDB 'users' collection.
    Creates unique indexes on google_id and email.
    """
    google_id = google_data["google_id"]
    email = google_data["email"]
    name = google_data.get("name") or email.split("@")[0]
    picture = google_data.get("picture")

    now = datetime.utcnow()
    user_doc = None

    try:
        db = get_database()
        coll = db["users"]

        # Create indexes
        try:
            coll.create_index("google_id", unique=True)
            coll.create_index("email", unique=True)
        except Exception:
            pass

        # Try updating or inserting
        result = coll.find_one_and_update(
            {"google_id": google_id},
            {
                "$set": {
                    "email": email,
                    "name": name,
                    "picture": picture,
                    "last_login_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                }
            },
            upsert=True,
            return_document=True
        )
        if result:
            user_doc = {
                "id": str(result.get("_id")),
                "google_id": result["google_id"],
                "email": result["email"],
                "name": result["name"],
                "picture": result.get("picture"),
                "created_at": result.get("created_at"),
                "last_login_at": result.get("last_login_at"),
            }
    except Exception as err:
        print(f"[AuthService] MongoDB user upsert fallback: {err}")

    # Fallback to in-memory store if DB is offline
    if not user_doc:
        user_id = USERS_MEMORY.get(google_id, {}).get("id") or f"usr-{uuid.uuid4().hex[:12]}"
        user_doc = {
            "id": user_id,
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": now,
            "last_login_at": now,
        }
        USERS_MEMORY[google_id] = user_doc

    return UserResponse(**user_doc)


def create_session(user: UserResponse) -> str:
    """Creates a secure session token for the user and stores it."""
    session_id = f"sess_{uuid.uuid4().hex}"
    session_user = SessionUser(
        id=user.id,
        google_id=user.google_id,
        email=user.email,
        name=user.name,
        picture=user.picture
    )
    SESSIONS[session_id] = session_user
    return session_id


def get_user_from_session(session_id: str) -> Optional[SessionUser]:
    """Retrieves session user if session_id is valid."""
    if not session_id:
        return None
    return SESSIONS.get(session_id)


def destroy_session(session_id: str) -> bool:
    """Removes session_id from active sessions."""
    if session_id in SESSIONS:
        del SESSIONS[session_id]
        return True
    return False
