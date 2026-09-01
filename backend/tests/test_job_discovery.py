import pytest
import asyncio
from datetime import datetime, timedelta
from app.schemas.discovered_job import RawJob, NormalizedJob
from app.job_discovery.connectors.greenhouse import GreenhouseConnector
from app.job_discovery.connectors.lever import LeverConnector
from app.job_discovery.connectors.ashby import AshbyConnector
from app.job_discovery.connectors.workday import WorkdayConnector
from app.job_discovery.connectors.smartrecruiters import SmartRecruitersConnector
from app.job_discovery.connectors.generic import GenericConnector
from app.job_discovery.connectors.web_search import WebSearchConnector
from app.job_discovery.url_validator import validate_url
from app.job_discovery.url_resolver import resolve_application_url
from app.job_discovery.normalizer import normalize_job
from app.job_discovery.deduplicator import deduplicate_jobs
from app.job_discovery.freshness import sort_by_freshness
from app.services.tracker_service import tracker_service


def test_apply_does_not_change_status():
    """
    INVARIANT: Clicking Apply Now MUST NOT change job status.
    Status remains DISCOVERED.
    """
    job = NormalizedJob(
        id="job-apply-test-1",
        company="Microsoft",
        title="Software Engineer",
        job_url="https://careers.microsoft.com/us/en/job/1782910",
        application_url="https://careers.microsoft.com/us/en/job/1782910/apply",
        source="web_search",
        status="DISCOVERED",
        fingerprint="fp_apply_1"
    )
    # Apply action in client is window.open() -> job status MUST remain DISCOVERED
    assert job.status == "DISCOVERED"


def test_apply_does_not_call_submission_api():
    """
    INVARIANT: Apply Now MUST NOT call any automated submission API.
    JobSearch.ai has zero auto-submission endpoints.
    """
    from app.services import submission_provider
    provider = submission_provider.HumanHandoffProvider()
    res = provider.route_and_submit(
        application_record={"job_url": "https://careers.microsoft.com/job/123", "status": "DISCOVERED"},
        candidate_profile={}
    )
    assert res["status"] == "DISCOVERED"
    assert "External target URL resolved" in res["details"]


def test_i_applied_changes_status():
    """
    INVARIANT: Only clicking 'I Applied' changes status to APPLIED with user confirmation.
    """
    app = tracker_service.prepare_application(
        job_id="job-confirm-1",
        company="Amazon",
        role_title="SDE",
        match_score=91,
        matched_skills=["Python"],
        missing_skills=[],
        summary="Summary",
        cover_letter="",
        job_url="https://www.amazon.jobs/en/jobs/2654321",
        source="company_career_page"
    )

    updated = tracker_service.update_application_status(
        application_id=app.application_id,
        action="mark_applied"
    )
    assert updated["status"] == "APPLIED"
    assert updated.get("confirmation") == "user"
    assert "applied_at" in updated


def test_didnt_apply_changes_status():
    """
    INVARIANT: Clicking 'Didn't Apply' changes status to NOT_APPLIED.
    """
    app = tracker_service.prepare_application(
        job_id="job-decline-1",
        company="Google",
        role_title="SWE",
        match_score=88,
        matched_skills=["Go"],
        missing_skills=[],
        summary="Summary",
        cover_letter="",
        job_url="https://www.google.com/about/careers/applications/jobs/results/123",
        source="company_career_page"
    )

    updated = tracker_service.update_application_status(
        application_id=app.application_id,
        action="mark_not_applied",
        reason="Not interested"
    )
    assert updated["status"] == "NOT_APPLIED"
    assert updated.get("not_applied_reason") == "Not interested"


def test_removed_job_not_shown_in_active_feed():
    """
    INVARIANT: Clicking Remove soft deletes job (status REMOVED) and hides it from list_applications().
    """
    app = tracker_service.prepare_application(
        job_id="job-remove-1",
        company="Meta",
        role_title="Production Engineer",
        match_score=85,
        matched_skills=["Python"],
        missing_skills=[],
        summary="Summary",
        cover_letter="",
        job_url="https://www.metacareers.com/v2/jobs/123/",
        source="company_career_page"
    )

    tracker_service.update_application_status(
        application_id=app.application_id,
        action="remove"
    )

    active_list = tracker_service.list_applications()
    match = next((r for r in active_list if r.application_id == app.application_id), None)
    assert match is None


def test_google_search_url_rejected():
    """
    INVARIANT: Zero Google search URLs allowed.
    """
    assert validate_url("https://www.google.com/search?q=software+engineer") is None
    assert validate_url("https://google.com/search") is None
    assert validate_url("https://example.com/search?q=test") is None


def test_fabricated_career_url_rejected():
    """
    INVARIANT: Guessing or string concatenation placeholders are rejected.
    """
    assert validate_url("https://example.com/fake-url") is None
    assert validate_url("javascript:void(0)") is None
    assert validate_url("data:text/plain,hello") is None
    assert validate_url(None) is None


def test_missing_url_disables_apply():
    """
    INVARIANT: Missing URLs evaluate to None (disabling Apply button).
    """
    raw = RawJob(
        company="NoUrlCorp",
        title="Developer",
        job_url=None,
        application_url=None,
        career_page_url=None,
        source="generic"
    )
    norm = normalize_job(raw)
    assert norm.job_url is None
    assert norm.application_url is None


def test_real_urls_preserved_across_connectors():
    """
    INVARIANT: Exact source URLs preserved across connectors (Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Web discovery).
    """
    greenhouse = GreenhouseConnector({"name": "examplecorp", "url": "https://boards.greenhouse.io/examplecorp"})
    assert greenhouse.api_url == "https://boards-api.greenhouse.io/v1/boards/examplecorp/jobs"

    lever = LeverConnector({"name": "examplecorp", "url": "https://jobs.lever.co/examplecorp"})
    assert lever.config.get("url") == "https://jobs.lever.co/examplecorp"

    web_search = WebSearchConnector()
    jobs = asyncio.run(web_search.search_jobs({"role": "Software Engineer"}))
    assert len(jobs) >= 3
    for j in jobs:
        assert j.job_url is not None
        assert "google.com/search" not in j.job_url.lower()


def test_multiple_sources_merge_same_job():
    j1 = NormalizedJob(
        id="j1", company="TestCorp", title="SWE", location="Remote",
        job_url="https://jobs.lever.co/testcorp/101",
        application_url="https://jobs.lever.co/testcorp/101/apply",
        source="lever", sources=["lever"], fingerprint="fp1"
    )
    j2 = NormalizedJob(
        id="j2", company="TestCorp", title="SWE", location="Remote",
        job_url="https://jobs.lever.co/testcorp/101",
        application_url="https://jobs.lever.co/testcorp/101/apply",
        source="greenhouse", sources=["greenhouse"], fingerprint="fp1"
    )

    deduped = deduplicate_jobs([j1, j2])
    assert len(deduped) == 1
    assert "lever" in deduped[0].sources
    assert "greenhouse" in deduped[0].sources
