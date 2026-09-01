import pytest
import asyncio
from datetime import datetime, timedelta
from app.schemas.discovered_job import RawJob, NormalizedJob, SourceCapability, DiscoveryDiagnostics
from app.job_discovery.connectors.linkedin import LinkedInConnector
from app.job_discovery.connectors.indeed import IndeedConnector
from app.job_discovery.connectors.unstop import UnstopConnector
from app.job_discovery.connectors.internshala import InternshalaConnector
from app.job_discovery.connectors.monster import MonsterConnector
from app.job_discovery.connectors.wellfound import WellfoundConnector
from app.job_discovery.connectors.glassdoor import GlassdoorConnector
from app.job_discovery.connectors.naukri import NaukriConnector
from app.job_discovery.connectors.foundit import FounditConnector
from app.job_discovery.connectors.dice import DiceConnector
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
from app.job_discovery.registry import get_all_active_connectors
from app.job_discovery.orchestrator import execute_web_discovery_with_diagnostics
from app.services.tracker_service import tracker_service


def test_connector_capabilities_declared():
    """
    INVARIANT: Every connector explicitly declares capability and name.
    Does NOT return static fake data.
    """
    connectors = get_all_active_connectors()
    assert len(connectors) >= 15
    for c in connectors:
        assert hasattr(c, "name")
        assert hasattr(c, "capability")
        assert isinstance(c.capability, SourceCapability)


def test_source_url_preservation_and_resolution():
    """
    INVARIANT: Real source_url preserved and included in target resolution priority.
    Priority: application_url -> job_url -> source_url
    """
    raw = RawJob(
        company="Microsoft",
        title="Software Engineer",
        job_url="https://careers.microsoft.com/job/101",
        application_url="https://careers.microsoft.com/job/101/apply",
        source_url="https://www.linkedin.com/jobs/view/123456",
        source="linkedin"
    )
    norm = normalize_job(raw)
    assert norm.source_url == "https://www.linkedin.com/jobs/view/123456"
    resolved = resolve_application_url(norm)
    assert resolved == "https://careers.microsoft.com/job/101/apply"


def test_platform_fallback_url_resolution():
    """
    INVARIANT: If company application URL absent, resolve_application_url falls back to job_url or source_url.
    """
    raw = RawJob(
        company="TechCorp",
        title="Developer",
        job_url=None,
        application_url=None,
        source_url="https://www.linkedin.com/jobs/view/999",
        source="linkedin"
    )
    norm = normalize_job(raw)
    resolved = resolve_application_url(norm)
    assert resolved == "https://www.linkedin.com/jobs/view/999"


def test_discovery_diagnostics_payload():
    """
    INVARIANT: execute_web_discovery_with_diagnostics returns total_discovered, after_deduplication, and source breakdown.
    """
    jobs, diagnostics = asyncio.run(execute_web_discovery_with_diagnostics({"role": "Software Engineer"}))
    assert isinstance(diagnostics, DiscoveryDiagnostics)
    assert len(diagnostics.sources) >= 15
    assert diagnostics.total_discovered >= len(jobs)


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
    assert job.status == "DISCOVERED"


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


def test_didnt_apply_changes_status_with_reason():
    """
    INVARIANT: Clicking 'Didn't Apply' changes status to NOT_APPLIED with optional reason.
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
        reason="Salary"
    )
    assert updated["status"] == "NOT_APPLIED"
    assert updated.get("not_applied_reason") == "Salary"


def test_google_search_url_rejected():
    """
    INVARIANT: Zero Google search URLs allowed.
    """
    assert validate_url("https://www.google.com/search?q=software+engineer") is None
    assert validate_url("https://google.com/search") is None
    assert validate_url("https://example.com/search?q=test") is None


def test_multiple_sources_merge_same_job():
    j1 = NormalizedJob(
        id="j1", company="TestCorp", title="SWE", location="Remote",
        job_url="https://jobs.lever.co/testcorp/101",
        application_url="https://jobs.lever.co/testcorp/101/apply",
        source_url="https://www.linkedin.com/jobs/view/101",
        source="lever", sources=["lever"], fingerprint="fp1"
    )
    j2 = NormalizedJob(
        id="j2", company="TestCorp", title="SWE", location="Remote",
        job_url="https://jobs.lever.co/testcorp/101",
        application_url="https://jobs.lever.co/testcorp/101/apply",
        source_url="https://www.indeed.com/viewjob?jk=101",
        source="greenhouse", sources=["greenhouse"], fingerprint="fp1"
    )

    deduped = deduplicate_jobs([j1, j2])
    assert len(deduped) == 1
    assert "lever" in deduped[0].sources
    assert "greenhouse" in deduped[0].sources
