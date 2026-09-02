import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.auth import service

client = TestClient(app)

MOCK_GOOGLE_TOKEN_PAYLOAD = {
    "google_id": "google-user-12345",
    "email": "candidate.test@example.com",
    "name": "Candidate Test",
    "picture": "https://example.com/avatar.jpg",
    "email_verified": True
}

def test_auth_me_unauthenticated_returns_401():
    """INVARIANT: Accessing /auth/me without a session cookie returns 401 Unauthorized."""
    resp = client.get("/api/auth/me")
    assert resp.status_code == 401
    assert "detail" in resp.json()

@patch("app.auth.google.verify_google_token")
def test_google_login_creates_user_and_session_cookie(mock_verify):
    """INVARIANT: Valid Google token creates user, session, and returns HttpOnly cookie."""
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD

    resp = client.post(
        "/api/auth/google",
        json={"credential": "mock-valid-google-jwt-token"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "candidate.test@example.com"
    assert data["name"] == "Candidate Test"
    assert "jobsearch_session" in resp.cookies

    # Test /auth/me with the session cookie
    session_cookie = resp.cookies["jobsearch_session"]
    me_resp = client.get(
        "/api/auth/me",
        cookies={"jobsearch_session": session_cookie}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "candidate.test@example.com"
    assert me_data["google_id"] == "google-user-12345"

@patch("app.auth.google.verify_google_token")
def test_invalid_google_token_rejected(mock_verify):
    """INVARIANT: Invalid Google token returns 401 Unauthorized."""
    mock_verify.return_value = None

    resp = client.post(
        "/api/auth/google",
        json={"credential": "invalid-token"}
    )
    assert resp.status_code == 401

@patch("app.auth.google.verify_google_token")
def test_logout_clears_session_and_cookie(mock_verify):
    """INVARIANT: Logout destroys session and clears cookie."""
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD

    login_resp = client.post(
        "/api/auth/google",
        json={"credential": "mock-valid-google-jwt-token"}
    )
    cookie = login_resp.cookies["jobsearch_session"]

    logout_resp = client.post(
        "/api/auth/logout",
        cookies={"jobsearch_session": cookie}
    )
    assert logout_resp.status_code == 200

    # /auth/me should now return 401
    me_after_logout = client.get("/api/auth/me")
    assert me_after_logout.status_code == 401
