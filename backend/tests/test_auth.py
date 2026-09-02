import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.auth import service

client = TestClient(app)

MOCK_GOOGLE_TOKEN_PAYLOAD_USER_A = {
    "google_id": "google-user-A",
    "email": "userA@example.com",
    "name": "User A",
    "picture": "https://example.com/avatarA.jpg",
    "email_verified": True
}

MOCK_GOOGLE_TOKEN_PAYLOAD_USER_B = {
    "google_id": "google-user-B",
    "email": "userB@example.com",
    "name": "User B",
    "picture": "https://example.com/avatarB.jpg",
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
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD_USER_A

    resp = client.post(
        "/api/auth/google",
        json={"credential": "mock-valid-google-jwt-token"}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "userA@example.com"
    assert data["name"] == "User A"
    assert "jobsearch_session" in resp.cookies

    # Test /auth/me with the session cookie
    session_cookie = resp.cookies["jobsearch_session"]
    me_resp = client.get(
        "/api/auth/me",
        cookies={"jobsearch_session": session_cookie}
    )
    assert me_resp.status_code == 200
    me_data = me_resp.json()
    assert me_data["email"] == "userA@example.com"
    assert me_data["google_id"] == "google-user-A"

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
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD_USER_A

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

@patch("app.auth.google.verify_google_token")
def test_user_profiles_are_isolated(mock_verify):
    """INVARIANT: Candidate profile changes for User A do NOT affect User B."""
    # 1. Login User A
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD_USER_A
    login_a = client.post("/api/auth/google", json={"credential": "jwt-a"})
    cookie_a = login_a.cookies["jobsearch_session"]

    # 2. Login User B
    mock_verify.return_value = MOCK_GOOGLE_TOKEN_PAYLOAD_USER_B
    login_b = client.post("/api/auth/google", json={"credential": "jwt-b"})
    cookie_b = login_b.cookies["jobsearch_session"]

    # 3. User A updates their title to "Senior Software Engineer"
    custom_profile_a = {
        "personal_info": {"name": "User A", "email": "userA@example.com", "title": "Senior Software Engineer"},
        "summary": "User A unique summary",
        "skills": {"languages": ["Python", "FastAPI"], "frontend": [], "backend": [], "ai_ml": [], "databases": [], "devops_tools": []},
        "projects": [],
        "experience": [],
        "education": []
    }
    put_a = client.put("/api/resume", json=custom_profile_a, cookies={"jobsearch_session": cookie_a})
    assert put_a.status_code == 200

    # 4. User B updates their title to "Lead Data Scientist"
    custom_profile_b = {
        "personal_info": {"name": "User B", "email": "userB@example.com", "title": "Lead Data Scientist"},
        "summary": "User B unique summary",
        "skills": {"languages": ["R", "PyTorch"], "frontend": [], "backend": [], "ai_ml": [], "databases": [], "devops_tools": []},
        "projects": [],
        "experience": [],
        "education": []
    }
    put_b = client.put("/api/resume", json=custom_profile_b, cookies={"jobsearch_session": cookie_b})
    assert put_b.status_code == 200

    # 5. Verify User A gets User A's profile
    get_a = client.get("/api/resume", cookies={"jobsearch_session": cookie_a})
    assert get_a.json()["personal_info"]["title"] == "Senior Software Engineer"
    assert get_a.json()["personal_info"]["email"] == "userA@example.com"

    # 6. Verify User B gets User B's profile, completely independent of User A
    get_b = client.get("/api/resume", cookies={"jobsearch_session": cookie_b})
    assert get_b.json()["personal_info"]["title"] == "Lead Data Scientist"
    assert get_b.json()["personal_info"]["email"] == "userB@example.com"
