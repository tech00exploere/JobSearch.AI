import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any, Tuple
from app.schemas.discovered_job import (
    RawJob, NormalizedJob, SourceCapability, SourceDiagnostic, DiscoveryDiagnostics
)
from app.job_discovery.registry import get_all_active_connectors, create_connector
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

async def execute_web_discovery_with_diagnostics(
    criteria: Dict[str, Any]
) -> Tuple[List[NormalizedJob], DiscoveryDiagnostics]:
    """
    Main Web Discovery Engine with Diagnostic Breakdown:
    1. Loads known career page sources + ATS connectors + Platform connectors + Web Search discovery provider
    2. Runs all connectors concurrently using asyncio.gather with error isolation
    3. Records per-source capability, status, jobs retrieved count, and error messages
    4. Normalizes and validates URLs (ensuring zero Google search fallbacks)
    5. Deduplicates across sources and merges provider tags
    6. Sorts by posting freshness
    7. Persists to MongoDB / JSON fallback
    """
    connectors = get_all_active_connectors()
    
    # Also load specific configured career pages if any
    entries = load_career_pages()
    for entry in entries:
        connectors.append(create_connector(entry))

    raw_jobs: List[RawJob] = []
    source_diagnostics: List[SourceDiagnostic] = []

    async def safe_fetch(conn):
        conn_name = getattr(conn, "name", conn.__class__.__name__.replace("Connector", ""))
        capability = getattr(conn, "capability", SourceCapability.UNAVAILABLE)
        
        try:
            results = await conn.search_jobs(criteria)
            count = len(results) if results else 0
            if results:
                raw_jobs.extend(results)
            
            status = "ok" if count > 0 else "unavailable"
            source_diagnostics.append(
                SourceDiagnostic(
                    name=conn_name,
                    status=status,
                    capability=capability,
                    jobs_retrieved=count
                )
            )
        except Exception as err:
            print(f"[JobDiscovery] Error fetching from connector {conn_name}: {err}")
            source_diagnostics.append(
                SourceDiagnostic(
                    name=conn_name,
                    status="error",
                    capability=capability,
                    jobs_retrieved=0,
                    error_message=str(err)
                )
            )

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

    total_discovered = len(normalized_list)

    # Multi-signal Deduplicate
    unique_jobs = deduplicate_jobs(normalized_list)
    after_deduplication = len(unique_jobs)

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

    # Persist to MongoDB & JSON fallback
    persist_discovered_jobs(sorted_jobs)

    # Sort diagnostics by jobs_retrieved DESC
    source_diagnostics.sort(key=lambda s: s.jobs_retrieved, reverse=True)

    diagnostics = DiscoveryDiagnostics(
        total_discovered=total_discovered,
        after_deduplication=after_deduplication,
        sources=source_diagnostics
    )

    return sorted_jobs, diagnostics

async def execute_web_discovery(criteria: Dict[str, Any]) -> List[NormalizedJob]:
    """Legacy helper returning list of NormalizedJobs."""
    jobs, _ = await execute_web_discovery_with_diagnostics(criteria)
    return jobs

def persist_discovered_jobs(jobs: List[NormalizedJob]) -> None:
    """Persists discovered jobs to MongoDB or JSON fallback."""
    try:
        db = get_database()
        coll = db["discovered_jobs"]

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
