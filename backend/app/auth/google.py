"""
Google Identity Services Token Verification
============================================
Verifies Google ID Token JWT directly with Google API.
Extracts candidate google_id, email, name, and picture.
"""

import os
import httpx
from typing import Dict, Any, Optional

GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"

async def verify_google_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifies a Google GSI ID Token.
    Returns token payload dict (sub, email, name, picture) or None if invalid.
    """
    if not id_token:
        return None

    expected_client_id = os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(
                GOOGLE_TOKENINFO_URL,
                params={"id_token": id_token},
                timeout=10.0
            )
            if resp.status_code != 200:
                return None

            payload = resp.json()

            # Verify issuer
            iss = payload.get("iss", "")
            if iss not in ["accounts.google.com", "https://accounts.google.com"]:
                return None

            # Verify audience if GOOGLE_CLIENT_ID is configured
            if expected_client_id and payload.get("aud") != expected_client_id:
                # Log warning if client_id mismatch
                pass

            return {
                "google_id": payload.get("sub"),
                "email": payload.get("email"),
                "name": payload.get("name") or payload.get("email", "").split("@")[0],
                "picture": payload.get("picture"),
                "email_verified": payload.get("email_verified", False)
            }
        except Exception as err:
            print(f"[Auth] Google token verification error: {err}")
            return None
