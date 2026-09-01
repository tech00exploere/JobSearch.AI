from typing import List, Dict
from app.schemas.discovered_job import NormalizedJob

def deduplicate_jobs(jobs: List[NormalizedJob]) -> List[NormalizedJob]:
    """
    Deduplicates a list of NormalizedJob records using multi-signal matching:
    1. Exact external_id + source
    2. Exact canonical job_url
    3. Exact application_url
    4. Company + Title + Location fingerprint
    Merges source list when duplicate listings exist across multiple providers.
    """
    seen: Dict[str, NormalizedJob] = {}

    for job in jobs:
        # Generate match keys
        key_id = f"ext:{job.source}:{job.external_id}" if job.external_id else None
        key_job_url = f"jurl:{job.job_url.lower()}" if job.job_url else None
        key_app_url = f"aurl:{job.application_url.lower()}" if job.application_url else None
        key_fp = f"fp:{job.fingerprint}"

        match_key = None
        for k in [key_id, key_job_url, key_app_url, key_fp]:
            if k and k in seen:
                match_key = k
                break

        if match_key and match_key in seen:
            existing = seen[match_key]
            # Merge sources list
            for s in job.sources:
                if s not in existing.sources:
                    existing.sources.append(s)

            # Preserve most complete URLs
            if not existing.job_url and job.job_url:
                existing.job_url = job.job_url
            if not existing.application_url and job.application_url:
                existing.application_url = job.application_url
            if not existing.career_page_url and job.career_page_url:
                existing.career_page_url = job.career_page_url

            # Keep newest posted_at date if present
            if job.posted_at and (not existing.posted_at or job.posted_at > existing.posted_at):
                existing.posted_at = job.posted_at
        else:
            primary_key = key_fp
            seen[primary_key] = job
            if key_id:
                seen[key_id] = job
            if key_job_url:
                seen[key_job_url] = job
            if key_app_url:
                seen[key_app_url] = job

    # Return unique NormalizedJob list
    unique_map = {}
    for job in seen.values():
        unique_map[job.id] = job
    return list(unique_map.values())
