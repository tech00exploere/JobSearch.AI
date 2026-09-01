from typing import Optional, Dict, Any
from app.schemas.discovered_job import RawJob, NormalizedJob
from app.job_discovery.url_validator import validate_url

def resolve_application_url(
    job_or_raw: Any,
    discovered_apply_link: Optional[str] = None
) -> Optional[str]:
    """
    Resolves the exact real application URL following strict priority order:
    1. Explicit application_url returned by the discovery source (if validated).
    2. Exact Apply link discovered from the job posting page.
    3. Exact canonical job_url if the posting page itself contains the embedded application form.
    4. Otherwise None.

    STRICT GUARANTEE: Never constructs a fake URL or returns a search fallback.
    Returns None if no trustworthy application link is available.
    """
    if isinstance(job_or_raw, (RawJob, NormalizedJob)):
        app_url = getattr(job_or_raw, "application_url", None)
        job_url = getattr(job_or_raw, "job_url", None)
    elif isinstance(job_or_raw, dict):
        app_url = job_or_raw.get("application_url")
        job_url = job_or_raw.get("job_url")
    else:
        app_url = None
        job_url = None

    # Priority 1: Explicit application_url from source
    valid_app = validate_url(app_url)
    if valid_app:
        return valid_app

    # Priority 2: Discovered apply link on page
    valid_discovered = validate_url(discovered_apply_link)
    if valid_discovered:
        return valid_discovered

    # Priority 3: Canonical job_url if page contains embedded application form
    valid_job = validate_url(job_url)
    if valid_job:
        # Check if job_url points to a known direct posting page
        return valid_job

    # Priority 4: Fallback to None (Do NOT guess or fabricate)
    return None
