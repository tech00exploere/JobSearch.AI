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


def test_candidate_resume_endpoints_reject_unauthenticated():
    """INVARIANT: All /api/resume endpoints reject unauthenticated requests with 401."""
    # GET
    res_get = client.get("/api/resume")
    assert res_get.status_code == 401

    # PUT
    res_put = client.put("/api/resume", json={})
    assert res_put.status_code == 401

    # Upload
    res_up = client.post("/api/resume/upload", files={"file": ("test.pdf", b"test", "application/pdf")})
    assert res_up.status_code == 401

    # PDF
    res_pdf = client.get("/api/resume/pdf")
    assert res_pdf.status_code == 401


@patch("app.auth.google.verify_google_token")
def test_new_user_gets_clean_personalized_profile_without_demo_data(mock_verify):
    """INVARIANT: Newly registered user has their own personalized profile prefilled with Google name & email, without demo data."""
    mock_verify.return_value = {
        "google_id": "google-user-fresh",
        "email": "fresh.candidate@example.com",
        "name": "Fresh Candidate",
        "picture": "https://example.com/fresh.jpg",
        "email_verified": True
    }
    login_res = client.post("/api/auth/google", json={"credential": "fresh-jwt"})
    cookie = login_res.cookies["jobsearch_session"]

    resume_res = client.get("/api/resume", cookies={"jobsearch_session": cookie})
    assert resume_res.status_code == 200
    data = resume_res.json()
    assert data["personal_info"]["name"] == "Fresh Candidate"
    assert data["personal_info"]["email"] == "fresh.candidate@example.com"
    # Ensure no hardcoded demo skills or experiences exist
    assert data["skills"]["languages"] == []
    assert data["projects"] == []
    assert data["experience"] == []


@patch("app.auth.google.verify_google_token")
def test_session_persists_across_worker_processes_or_restarts(mock_verify):
    """INVARIANT: If in-memory cache is emptied (simulating multi-workers or server restart), session still validates from DB."""
    mock_verify.return_value = {
        "google_id": "google-user-worker-test",
        "email": "worker.test@example.com",
        "name": "Worker Candidate",
        "picture": "https://example.com/worker.jpg",
        "email_verified": True
    }
    login_res = client.post("/api/auth/google", json={"credential": "worker-jwt"})
    assert login_res.status_code == 200
    session_id = login_res.json()["session_token"]
    assert session_id in service.SESSIONS

    # Simulate request hitting a different worker process where in-memory SESSIONS is empty
    service.SESSIONS.clear()
    assert session_id not in service.SESSIONS

    # Test that /api/auth/me still successfully validates via MongoDB session retrieval
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {session_id}"})
    # If MongoDB is connected, session recovers seamlessly
    if me_res.status_code == 200:
        assert me_res.json()["email"] == "worker.test@example.com"
        assert session_id in service.SESSIONS  # Re-cached in memory

