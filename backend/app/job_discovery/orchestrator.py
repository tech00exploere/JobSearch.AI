import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob, NormalizedJob
from app.job_discovery.registry import create_connector
from app.job_discovery.connectors.web_search import WebSearchConnector
from app.job_discovery.normalizer import normalize_job
from app.job_discovery.deduplicator import deduplicate_jobs
from app.job_discovery.freshness import sort_by_freshness
from app.db.mongo_client import get_database

CONFIG_PATH = Path(__file__).resolve().parents[1] / "data" / "career_pages.json"

def load_career_pages() -> List[dict]:
    """Loads configured known career pages."""
    if not CONFIG_PATH.is_file():
        return []
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []

async def execute_web_discovery(criteria: Dict[str, Any]) -> List[NormalizedJob]:
    """
    Main Web Discovery Engine:
    1. Loads known career page sources + ATS connectors + Web Search discovery provider
    2. Runs all connectors concurrently using asyncio.gather with error isolation
    3. Normalizes and validates URLs (ensuring zero Google search fallbacks)
    4. Deduplicates across sources and merges provider tags
    5. Sorts by posting freshness
    6. Persists to MongoDB / JSON fallback
    """
    entries = load_career_pages()
    connectors = [create_connector(entry) for entry in entries]

    # Always include Web Search discovery provider
    connectors.append(WebSearchConnector())

    # Concurrently fetch raw jobs with error isolation
    raw_jobs: List[RawJob] = []

    async def safe_fetch(conn):
        try:
            results = await conn.search_jobs(criteria)
            if results:
                raw_jobs.extend(results)
        except Exception as err:
            print(f"[JobDiscovery] Error fetching from connector {conn.__class__.__name__}: {err}")

    await asyncio.gather(*(safe_fetch(c) for c in connectors))

    # Normalize & Validate URLs
    normalized_list = [normalize_job(r) for r in raw_jobs]

    # Filter by user location if provided
    loc_q = (criteria.get("location") or "").lower()
    if loc_q:
        normalized_list = [
            j for j in normalized_list
            if not j.location or loc_q in j.location.lower() or "remote" in j.location.lower()
        ]

    # Multi-signal Deduplicate
    unique_jobs = deduplicate_jobs(normalized_list)

    # Sort by Freshness (newest first)
    sorted_jobs = sort_by_freshness(unique_jobs)

    # Calculate deterministic match scores against candidate master resume if possible
    try:
        from app.services.matching_service import matching_service
        for job in sorted_jobs:
            req_skills = job.skills or ["Python", "FastAPI", "React", "TypeScript"]
            match_res = matching_service.calculate_job_match(
                job_id=job.id,
                company=job.company,
                role_title=job.title,
                required_skills=req_skills
            )
            job.match_score = float(match_res.overall_match_score)
    except Exception:
        pass

    # Persist to MongoDB (with index creation) & JSON fallback
    persist_discovered_jobs(sorted_jobs)

    return sorted_jobs

def persist_discovered_jobs(jobs: List[NormalizedJob]) -> None:
    """Persists discovered jobs to MongoDB or JSON fallback."""
    try:
        db = get_database()
        coll = db["discovered_jobs"]

        # Ensure indexes exist
        try:
            coll.create_index("fingerprint", unique=True)
            coll.create_index("job_url")
            coll.create_index("application_url")
            coll.create_index("company")
            coll.create_index("posted_at")
        except Exception:
            pass

        for j in jobs:
            doc = j.dict()
            doc["_id"] = j.fingerprint
            coll.replace_one({"_id": j.fingerprint}, doc, upsert=True)
    except Exception:
        # Fallback to persistent JSON file
        fallback_path = Path(__file__).resolve().parents[1] / "data" / "discovered_jobs.json"
        try:
            existing = []
            if fallback_path.is_file():
                with open(fallback_path, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            map_dict = {item.get("fingerprint"): item for item in existing if isinstance(item, dict) and "fingerprint" in item}
            for j in jobs:
                map_dict[j.fingerprint] = j.dict()
            with open(fallback_path, "w", encoding="utf-8") as f:
                json.dump(list(map_dict.values()), f, indent=2, default=str)
        except Exception as e2:
            print(f"[JobDiscovery] JSON persistence error: {e2}")
