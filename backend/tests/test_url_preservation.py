import pytest
import asyncio
from app.job_discovery.connectors.greenhouse import GreenhouseConnector
from app.job_discovery.connectors.lever import LeverConnector
from app.job_discovery.url_validator import validate_url
from app.services.tracker_service import tracker_service


def test_greenhouse_url_preservation():
    connector = GreenhouseConnector({"name": "examplecorp", "url": "https://boards.greenhouse.io/examplecorp"})
    assert connector.config.get("name").lower() == "examplecorp"
    # Config is accessible
    assert connector.config.get("url") == "https://boards.greenhouse.io/examplecorp"


def test_lever_url_preservation():
    connector = LeverConnector({"name": "examplecorp", "url": "https://jobs.lever.co/examplecorp"})
    assert connector.config.get("url") == "https://jobs.lever.co/examplecorp"


def test_tracker_service_preserves_urls():
    app = tracker_service.prepare_application(
        job_id="test-job-99",
        company="TestCorp",
        role_title="Lead Architect",
        match_score=95,
        matched_skills=["Python", "FastAPI"],
        missing_skills=[],
        summary="Test summary",
        cover_letter="Test cover letter",
        job_url="https://boards.greenhouse.io/testcorp/jobs/9999",
        career_page_url="https://boards.greenhouse.io/testcorp",
        source="greenhouse"
    )

    assert app.job_url == "https://boards.greenhouse.io/testcorp/jobs/9999"
    assert app.career_page_url == "https://boards.greenhouse.io/testcorp"
    assert app.source == "greenhouse"

    records = tracker_service.list_applications()
    match = next((r for r in records if r.application_id == app.application_id), None)
    assert match is not None
    assert match.job_url == "https://boards.greenhouse.io/testcorp/jobs/9999"
    assert match.career_page_url == "https://boards.greenhouse.io/testcorp"
    assert match.source == "greenhouse"


def test_no_google_search_urls():
    records = tracker_service.list_applications()
    for r in records:
        if r.job_url:
            assert "google.com/search" not in r.job_url.lower()
        if r.career_page_url:
            assert "google.com/search" not in r.career_page_url.lower()
    # Also verify url_validator blocks these
    assert validate_url("https://www.google.com/search?q=software+engineer") is None


def test_missing_urls_are_none():
    app = tracker_service.prepare_application(
        job_id="test-job-missing",
        company="NoUrlCorp",
        role_title="Developer",
        match_score=70,
        matched_skills=["Python"],
        missing_skills=[],
        summary="Summary",
        cover_letter="Letter",
        job_url=None,
        career_page_url=None,
        source="generic"
    )
    assert app.job_url is None
    assert app.career_page_url is None

    records = tracker_service.list_applications()
    match = next((r for r in records if r.application_id == app.application_id), None)
    assert match is not None
    assert match.job_url is None
    assert match.career_page_url is None
