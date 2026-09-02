"""
User CRUD & Session Management Service
======================================
Manages candidate users in MongoDB ('users' collection)
and handles session token generation, validation, and user-isolated profiles.
"""

import uuid
import os
import json
from datetime import datetime
from typing import Dict, Any, Optional
from bson import ObjectId
from app.db.mongo_client import get_database
from app.auth.schemas import UserResponse, SessionUser

# In-memory stores for fallback
SESSIONS: Dict[str, SessionUser] = {}
USERS_MEMORY: Dict[str, Dict[str, Any]] = {}
USER_PROFILES_MEMORY: Dict[str, Dict[str, Any]] = {}

DEFAULT_RESUME_PATH = os.path.join(os.path.dirname(__file__), "../data/master_resume.json")


def _get_default_resume_template(name: str = "", email: str = "") -> Dict[str, Any]:
    """Loads baseline template and populates user info."""
    data = {}
    if os.path.exists(DEFAULT_RESUME_PATH):
        try:
            with open(DEFAULT_RESUME_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
        except Exception:
            pass
    if not data:
        data = {
            "personal_info": {"name": name, "email": email, "title": "", "phone": "", "location": "", "github": "", "linkedin": ""},
            "summary": "",
            "skills": {"languages": [], "frontend": [], "backend": [], "ai_ml": [], "databases": [], "devops_tools": []},
            "projects": [],
            "experience": [],
            "education": []
        }
    else:
        # Override name and email with user's own if newly initialized
        if name and not data.get("personal_info", {}).get("name"):
            data["personal_info"]["name"] = name
        if email and not data.get("personal_info", {}).get("email"):
            data["personal_info"]["email"] = email
    return data


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

        try:
            coll.create_index("google_id", unique=True)
            coll.create_index("email", unique=True)
        except Exception:
            pass

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


def get_user_resume_profile(user: Optional[SessionUser]) -> Dict[str, Any]:
    """
    Retrieves candidate's isolated master resume profile from MongoDB.
    Falls back to user-populated default template.
    """
    if not user:
        return _get_default_resume_template()

    # Try MongoDB
    try:
        db = get_database()
        coll = db["users"]
        query: Dict[str, Any] = {}
        try:
            query = {"_id": ObjectId(user.id)}
        except Exception:
            query = {"$or": [{"google_id": user.google_id}, {"email": user.email}]}

        doc = coll.find_one(query)
        if doc and doc.get("resume_profile"):
            return doc["resume_profile"]
    except Exception as err:
        print(f"[AuthService] DB get profile error: {err}")

    # Try memory
    if user.id in USER_PROFILES_MEMORY:
        return USER_PROFILES_MEMORY[user.id]

    # Return template prefilled with this candidate's name & email
    template = _get_default_resume_template(name=user.name, email=user.email)
    template["personal_info"]["name"] = user.name
    template["personal_info"]["email"] = user.email
    return template


def save_user_resume_profile(user: Optional[SessionUser], profile_data: Dict[str, Any]) -> bool:
    """
    Saves candidate's isolated master resume profile to MongoDB.
    """
    if not user:
        # Fallback to local default file for legacy guest mode
        try:
            with open(DEFAULT_RESUME_PATH, "w", encoding="utf-8") as f:
                json.dump(profile_data, f, indent=2)
            return True
        except Exception:
            return False

    USER_PROFILES_MEMORY[user.id] = profile_data

    try:
        db = get_database()
        coll = db["users"]
        query: Dict[str, Any] = {}
        try:
            query = {"_id": ObjectId(user.id)}
        except Exception:
            query = {"$or": [{"google_id": user.google_id}, {"email": user.email}]}

        coll.update_one(
            query,
            {"$set": {"resume_profile": profile_data, "profile_updated_at": datetime.utcnow()}},
            upsert=True
        )
        return True
    except Exception as err:
        print(f"[AuthService] DB save profile error: {err}")
        return True
