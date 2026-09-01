import hashlib
import uuid
from typing import List, Optional
from app.schemas.discovered_job import RawJob, NormalizedJob
from app.job_discovery.url_validator import validate_url
from app.job_discovery.url_resolver import resolve_application_url

def compute_fingerprint(company: str, title: str, location: str, job_url: Optional[str] = None) -> str:
    """Computes a deterministic hash fingerprint across key job fields."""
    norm_comp = (company or "").strip().lower()
    norm_title = (title or "").strip().lower()
    norm_loc = (location or "").strip().lower()
    url_part = (job_url or "").strip().lower()
    raw_key = f"{norm_comp}|{norm_title}|{norm_loc}|{url_part}"
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

def normalize_job(raw: RawJob) -> NormalizedJob:
    """Standardizes a RawJob into a NormalizedJob model."""
    valid_job_url = validate_url(raw.job_url or raw.url)
    valid_app_url = resolve_application_url(raw)
    valid_career_url = validate_url(raw.career_page_url)

    loc = raw.location or ""
    is_remote = any(term in loc.lower() for term in ["remote", "work from home", "wfh"])

    fp = compute_fingerprint(raw.company, raw.title, loc, valid_job_url)
    job_id = raw.id or f"job-{fp[:12]}"

    source_name = raw.source or "generic"
    sources_list = [source_name]

    return NormalizedJob(
        id=job_id,
        external_id=raw.external_id,
        company=raw.company.strip(),
        title=raw.title.strip(),
        location=loc.strip(),
        description=raw.description,
        job_url=valid_job_url,
        application_url=valid_app_url,
        career_page_url=valid_career_url,
        source=source_name,
        source_type=raw.source_type or "api",
        sources=sources_list,
        remote=is_remote,
        employment_type="Full-Time" if "intern" not in raw.title.lower() else "Internship",
        experience_level="0-2 years",
        posted_at=raw.posted_at,
        discovered_at=raw.discovered_at,
        fingerprint=fp,
        skills=[],
        status="DISCOVERED"
    )
