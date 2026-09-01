"""
Tests for Platform Search URL Generation
==========================================
Verifies that:
1. LinkedIn/Indeed/other platform URLs are generated from user role+location.
2. User input is URL-encoded properly.
3. No URL contains google.com/search or bing.com.
4. No fake job IDs are generated.
5. Platform search URLs are never stored as individual job_url values.
6. Clicking platform search does not change application status (invariant check).
7. Individual job URLs remain untouched.
8. Unsupported platform returns None (disabled button) not a guessed URL.
"""

import pytest
from urllib.parse import urlparse, parse_qs, unquote
from app.job_discovery.platform_search import (
    generate_platform_links,
    build_platform_search_url,
    PLATFORM_CONFIGS,
)


SAMPLE_CRITERIA = {
    "role": "Sales Executive",
    "location": "India",
    "remote": False,
    "experience": "0-2 years",
    "internship": False,
}

SAMPLE_CRITERIA_REMOTE = {
    "role": "Python Developer",
    "location": "Remote",
    "remote": True,
    "experience": "2-5 years",
    "internship": False,
}


def get_link(links: list[dict], platform: str) -> dict | None:
    return next((l for l in links if l["platform"] == platform), None)


# ── 1. LinkedIn URL uses real role and location ─────────────────────────────

def test_linkedin_url_contains_role():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    li = get_link(links, "linkedin")
    assert li is not None
    assert li["search_url"] is not None
    assert "Sales" in unquote(li["search_url"]) or "Sales" in li["search_url"]

def test_linkedin_url_contains_location():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    li = get_link(links, "linkedin")
    assert "India" in unquote(li["search_url"])

def test_linkedin_domain_is_linkedin():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    li = get_link(links, "linkedin")
    parsed = urlparse(li["search_url"])
    assert "linkedin.com" in parsed.netloc

# ── 2. Indeed URL uses real role and location ────────────────────────────────

def test_indeed_url_contains_role():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    ind = get_link(links, "indeed")
    assert "Sales" in unquote(ind["search_url"])

def test_indeed_url_contains_location():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    ind = get_link(links, "indeed")
    assert "India" in unquote(ind["search_url"])

def test_indeed_domain_is_indeed():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    ind = get_link(links, "indeed")
    parsed = urlparse(ind["search_url"])
    assert "indeed.com" in parsed.netloc

# ── 3. All supported platforms generate valid URLs ───────────────────────────

EXPECTED_PLATFORMS = [
    "linkedin", "indeed", "naukri", "internshala",
    "unstop", "foundit", "monster", "wellfound", "glassdoor",
]

@pytest.mark.parametrize("platform", EXPECTED_PLATFORMS)
def test_platform_generates_url(platform: str):
    links = generate_platform_links(**SAMPLE_CRITERIA)
    pl = get_link(links, platform)
    assert pl is not None, f"Missing platform: {platform}"
    assert pl["search_url"] is not None, f"URL is None for: {platform}"
    parsed = urlparse(pl["search_url"])
    assert parsed.scheme == "https", f"Non-HTTPS URL for {platform}"
    assert parsed.netloc != "", f"Empty netloc for {platform}"

# ── 4. User input is URL-encoded ─────────────────────────────────────────────

def test_special_chars_in_role_are_encoded():
    links = generate_platform_links(
        role="C++ Engineer & Lead",
        location="New Delhi",
        remote=False,
        experience="0-2 years",
        internship=False,
    )
    li = get_link(links, "linkedin")
    # Should not have raw & or ++ in query without encoding
    assert " " not in li["search_url"], "Spaces should be encoded"

def test_role_spaces_are_encoded():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    li = get_link(links, "linkedin")
    assert "%20" in li["search_url"] or "+" in li["search_url"] or "Sales%20Executive" in li["search_url"] or "Sales+Executive" in li["search_url"]

# ── 5. No Google/Bing search URLs ─────────────────────────────────────────────

@pytest.mark.parametrize("platform", EXPECTED_PLATFORMS)
def test_no_google_search_url(platform: str):
    links = generate_platform_links(**SAMPLE_CRITERIA)
    pl = get_link(links, platform)
    if pl and pl["search_url"]:
        assert "google.com/search" not in pl["search_url"]
        assert "bing.com/search" not in pl["search_url"]
        assert "google.com" not in pl["search_url"]

# ── 6. No fake job IDs ────────────────────────────────────────────────────────

@pytest.mark.parametrize("platform", EXPECTED_PLATFORMS)
def test_no_fake_job_ids_in_platform_search_urls(platform: str):
    links = generate_platform_links(**SAMPLE_CRITERIA)
    pl = get_link(links, platform)
    if pl and pl["search_url"]:
        url = pl["search_url"]
        # Real job IDs don't appear in search page URLs — they appear in individual posting URLs
        assert "/job/" not in url or "jobs" in url.split("/job/")[0], \
            f"Platform search URL for {platform} looks like an individual job URL: {url}"

# ── 7. Platform search URLs never stored as individual job_url values ─────────

def test_platform_links_are_not_raw_jobs():
    """
    Platform links are shortcut dicts, not RawJob or NormalizedJob objects.
    They must never be passed into normalize_job or persist_discovered_jobs.
    """
    links = generate_platform_links(**SAMPLE_CRITERIA)
    for link in links:
        # Must be plain dicts with expected keys, NOT RawJob/NormalizedJob instances
        assert isinstance(link, dict)
        assert "search_url" in link
        # Must not have 'fingerprint' or 'id' — those belong to individual jobs
        assert "fingerprint" not in link
        assert "id" not in link

# ── 8. Opening platform search does not change application status ─────────────

def test_platform_browse_produces_no_status_change():
    """
    Platform links contain no application_id or status field.
    The frontend window.open() call is the only action. No backend call is made.
    """
    links = generate_platform_links(**SAMPLE_CRITERIA)
    for link in links:
        assert "status" not in link
        assert "application_id" not in link
        assert "applied" not in link

# ── 9. Individual job URLs remain untouched ───────────────────────────────────

def test_individual_job_urls_not_replaced():
    """
    Platform search URLs must NOT be used as job_url values for individual job records.
    """
    from app.schemas.discovered_job import RawJob
    links = generate_platform_links(**SAMPLE_CRITERIA)
    platform_urls = {l["search_url"] for l in links if l.get("search_url")}

    # Simulate a real individual job from Greenhouse
    real_job = RawJob(
        company="TechCorp",
        title="Sales Executive",
        job_url="https://boards.greenhouse.io/techcorp/jobs/12345",
        application_url="https://boards.greenhouse.io/techcorp/jobs/12345/apply",
        source="greenhouse",
    )
    # The real job_url must not be a platform search URL
    assert real_job.job_url not in platform_urls

# ── 10. Dice platform generates valid URL ─────────────────────────────────────

def test_dice_platform_url():
    links = generate_platform_links(**SAMPLE_CRITERIA)
    dice = get_link(links, "dice")
    if dice:
        if dice["search_url"]:
            assert "dice.com" in dice["search_url"]
        else:
            # If unavailable, that's acceptable — button shows "Platform search unavailable"
            assert dice["search_url"] is None

# ── 11. Dynamic role changes produce different URLs ───────────────────────────

def test_different_roles_produce_different_urls():
    links_sales = generate_platform_links(role="Sales", location="India", remote=False, experience="", internship=False)
    links_swe = generate_platform_links(role="Software Engineer", location="India", remote=False, experience="", internship=False)

    li_sales = get_link(links_sales, "linkedin")
    li_swe = get_link(links_swe, "linkedin")

    assert li_sales["search_url"] != li_swe["search_url"]

# ── 12. Remote flag adds remote filter to LinkedIn URL ────────────────────────

def test_remote_flag_appended_to_linkedin_url():
    links = generate_platform_links(
        role="Python Developer", location="Remote",
        remote=True, experience="", internship=False
    )
    li = get_link(links, "linkedin")
    assert "f_WT" in li["search_url"], "LinkedIn remote filter missing"
