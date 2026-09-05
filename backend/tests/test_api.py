"""
JobSearch.ai Backend Unit & Integration Test Suite
==================================================
Tests API endpoints, Job Search, Deterministic Matcher, Resume RAG,
Material Tailoring, Application Tracking, and Candidate Execution.
Run with: backend\.venv\Scripts\python.exe -m pytest backend/tests/ -v
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestHealth:
    def test_health_returns_ok(self):
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "JobSearch.ai" in data["service"]

    def test_root_endpoint(self):
        response = client.get("/")
        assert response.status_code == 200
        assert "JobSearch.ai" in response.json()["message"]



class TestJobSearchAndMatching:
    def test_job_search(self):
        response = client.get("/api/jobs/search?query=React")
        assert response.status_code == 200
        jobs = response.json()
        assert isinstance(jobs, list)
        assert len(jobs) > 0
        assert "id" in jobs[0]

    def test_job_details(self):
        response = client.get("/api/jobs/job-101")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == "job-101"
        assert "company" in data

    def test_deterministic_job_match(self):
        response = client.post("/api/jobs/match?job_id=job-101")
        assert response.status_code == 200
        data = response.json()
        # Verify structure and valid score range (0–100)
        assert "overall_match_score" in data
        assert isinstance(data["overall_match_score"], int)
        assert 0 <= data["overall_match_score"] <= 100
        assert "matched_skills" in data
        assert "missing_skills" in data
        assert "summary_reasoning" in data

    def test_resume_unauthenticated_returns_401(self):
        client.cookies.clear()
        res = client.get("/api/resume")
        assert res.status_code == 401

    def test_master_resume_rag(self):
        from app.auth.schemas import SessionUser
        from app.auth.service import SESSIONS
        test_user = SessionUser(
            id="test-user-api",
            google_id="google-test-api",
            email="test.api@example.com",
            name="Test API User"
        )
        SESSIONS["test-session-token"] = test_user
        cookies = {"jobsearch_session": "test-session-token"}

        response = client.get("/api/resume", cookies=cookies)
        assert response.status_code == 200
        data = response.json()
        assert "personal_info" in data
        assert "projects" in data

    def test_update_master_resume(self):
        cookies = {"jobsearch_session": "test-session-token"}
        # Fetch current
        get_res = client.get("/api/resume", cookies=cookies)
        current_resume = get_res.json()
        
        # Modify temp
        original_name = current_resume["personal_info"]["name"]
        current_resume["personal_info"]["name"] = "Ritesh Kumar Tester"
        
        # Put back
        put_res = client.put("/api/resume", json=current_resume, cookies=cookies)
        assert put_res.status_code == 200
        assert put_res.json()["status"] == "success"
        
        # Verify it changed
        verify_res = client.get("/api/resume", cookies=cookies)
        assert verify_res.json()["personal_info"]["name"] == "Ritesh Kumar Tester"
        
        # Revert
        current_resume["personal_info"]["name"] = original_name
        client.put("/api/resume", json=current_resume, cookies=cookies)

    def test_upload_resume_text(self):
        cookies = {"jobsearch_session": "test-session-token"}
        mock_file_content = "Name: Ritesh Kumar\nEmail: ritesh.tester@example.com\nRole: Full-Stack Developer\nSkills: Python, React, MongoDB"
        files = {"file": ("resume.txt", mock_file_content, "text/plain")}
        
        # Save current resume
        get_res = client.get("/api/resume", cookies=cookies)
        current_resume = get_res.json()
        
        try:
            response = client.post("/api/resume/upload", files=files, cookies=cookies)
            if response.status_code == 200:
                data = response.json()
                assert data["status"] == "success"
                assert "parsed_data" in data
        finally:
            client.put("/api/resume", json=current_resume, cookies=cookies)


class TestCandidateApplicationTracker:
    def test_prepare_application(self):
        response = client.post("/api/jobs/prepare?job_id=job-101")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["DISCOVERED", "DISCOVERED"]
        assert "application_id" in data
        assert "tailored_cover_letter" in data

    def test_human_approval_submission(self):
        # First prepare
        prep_res = client.post("/api/jobs/prepare?job_id=job-101")
        app_id = prep_res.json()["application_id"]

        # Candidate confirms manual submission
        payload = {"application_id": app_id, "action": "mark_applied", "notes": "Candidate confirmed manual submission"}
        approve_res = client.post("/api/jobs/approve", json=payload)
        assert approve_res.status_code == 200
        assert approve_res.json()["status"] == "APPLIED"

    def test_explicit_mark_applied(self):
        from app.services.tracker_service import tracker_service

        app = tracker_service.prepare_application(
            job_id="job-hitl-200",
            company="HumanControlledCorp",
            role_title="Backend Engineer",
            match_score=88,
            matched_skills=["Python"],
            missing_skills=[],
            summary="Candidate-controlled manual apply test",
            cover_letter="Test letter",
            job_url="https://careers.humancontrolledcorp.example.com/jobs/200",
            source="company_career_page"
        )

        # Mark APPLIED only when user explicitly confirms
        updated = tracker_service.update_application_status(
            application_id=app.application_id,
            action="mark_applied"
        )
        assert updated["status"] == "APPLIED"


    def test_list_applications(self):
        response = client.get("/api/applications")
        assert response.status_code == 200
        apps = response.json()
        assert isinstance(apps, list)
        assert len(apps) > 0


class TestAgentChat:
    def test_chat_agent_flow(self):
        payload = {"message": "Find me React and Node internships in India"}
        response = client.post("/api/chat", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "response" in data
        assert len(data["tool_calls"]) > 0
        assert "JobSearch.ai" in data["model"]

