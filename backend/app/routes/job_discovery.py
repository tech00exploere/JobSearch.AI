import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from app.schemas.discovered_job import NormalizedJob
from app.job_discovery import orchestrator
from app.job_discovery.platform_search import generate_platform_links
from app.job_discovery.url_resolver import resolve_application_url
from app.services.matching_service import matching_service
from app.services.tracker_service import tracker_service
from app.services.llm_service import analyze_job_with_llm
from app.db.mongo_client import get_database

router = APIRouter()

@router.post("/job-discovery/search", summary="Search/Discover public web jobs across sources with diagnostics")
async def search_and_discover_jobs(criteria: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Executes Web-Wide Public Job Discovery across job platforms, company career sites,
    ATS portals, and generic web search. Normalizes, deduplicates, ranks jobs, and returns diagnostics.
    """
    jobs, diagnostics = await orchestrator.execute_web_discovery_with_diagnostics(criteria)
    # Filter out REMOVED jobs
    active_jobs = [j for j in jobs if getattr(j, "status", None) != "REMOVED"]
    return {
        "status": "success",
        "count": len(active_jobs),
        "jobs": active_jobs,
        "diagnostics": diagnostics.dict(),
        "source": "web_discovery"
    }

@router.post("/job-discovery/platform-links", summary="Generate real platform search URLs for user criteria")
async def get_platform_search_links(criteria: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """
    Returns real platform job-search URLs (LinkedIn, Indeed, Naukri, etc.)
    pre-populated with the user's search criteria.

    These are NOT individual job listings — they are links to the platform's
    own search results page. Clicking opens the external platform in a new tab.
    No API calls to any platform are made. No jobs are fetched.
    Opening a platform search link NEVER changes application status.
    """
    role = criteria.get("role") or "Software Engineer"
    location = criteria.get("location") or "India"
    remote = bool(criteria.get("remote", False))
    experience = criteria.get("experience") or ""
    internship = bool(criteria.get("internship", False))

    links = generate_platform_links(
        role=role,
        location=location,
        remote=remote,
        experience=experience,
        internship=internship,
    )
    return {
        "status": "success",
        "role": role,
        "location": location,
        "platform_links": links,
        "note": "These are direct links to each platform's own job search page. JobSearch.ai does not retrieve, cache, or claim ownership of listings from these platforms."
    }



@router.get("/discovered-jobs", summary="Get discovered public job listings")
async def get_discovered_jobs(
    role: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    remote: Optional[bool] = Query(None),
    limit: int = 100
) -> Dict[str, Any]:
    """Retrieve persisted discovered jobs sorted by freshness."""
    jobs: List[Dict[str, Any]] = []
    source_type = "empty"

    try:
        db = get_database()
        coll = db["discovered_jobs"]
        query: Dict[str, Any] = {"status": {"$ne": "REMOVED"}}
        if remote is not None:
            query["remote"] = remote
        if location:
            query["location"] = {"$regex": location, "$options": "i"}
        if role:
            query["title"] = {"$regex": role, "$options": "i"}

        raw_docs = list(coll.find(query, {"_id": 0}).limit(limit))
        if raw_docs:
            jobs = raw_docs
            source_type = "mongodb"
    except Exception:
        pass

    if not jobs:
        fallback_path = Path(__file__).resolve().parents[1] / "data" / "discovered_jobs.json"
        if fallback_path.is_file():
            try:
                with open(fallback_path, "r", encoding="utf-8") as f:
                    all_jobs = json.load(f)
                filtered = [j for j in all_jobs if j.get("status") != "REMOVED"]
                if role:
                    filtered = [j for j in filtered if role.lower() in j.get("title", "").lower()]
                if location:
                    filtered = [j for j in filtered if location.lower() in j.get("location", "").lower()]
                jobs = filtered[:limit]
                source_type = "json"
            except Exception:
                pass

    return {"count": len(jobs), "jobs": jobs, "source": source_type}

@router.get("/discovered-jobs/{job_id}", summary="Get discovered job details")
async def get_discovered_job_by_id(job_id: str) -> Dict[str, Any]:
    try:
        db = get_database()
        coll = db["discovered_jobs"]
        doc = coll.find_one({"id": job_id}, {"_id": 0})
        if doc:
            return doc
    except Exception:
        pass

    fallback_path = Path(__file__).resolve().parents[1] / "data" / "discovered_jobs.json"
    if fallback_path.is_file():
        try:
            with open(fallback_path, "r", encoding="utf-8") as f:
                all_jobs = json.load(f)
            for j in all_jobs:
                if j.get("id") == job_id:
                    return j
        except Exception:
            pass

    raise HTTPException(status_code=404, detail=f"Discovered job {job_id} not found.")

@router.post("/discovered-jobs/{job_id}/match", summary="Calculate deterministic resume match")
async def match_discovered_job(job_id: str) -> Dict[str, Any]:
    job_data = await get_discovered_job_by_id(job_id)
    req_skills = job_data.get("skills") or ["Python", "FastAPI", "React", "TypeScript"]

    match_res = matching_service.calculate_job_match(
        job_id=job_data.get("id", job_id),
        company=job_data.get("company", "Company"),
        role_title=job_data.get("title", "Role"),
        required_skills=req_skills
    )
    return match_res.dict()

@router.post("/discovered-jobs/{job_id}/analyze", summary="Run Gemini AI deep JD analysis")
async def analyze_discovered_job(job_id: str) -> Dict[str, Any]:
    job_data = await get_discovered_job_by_id(job_id)
    analysis = analyze_job_with_llm(job_data.get("description", ""), job_data.get("title", ""))
    return {"job_id": job_id, "analysis": analysis}

@router.post("/discovered-jobs/{job_id}/save", summary="Save job to candidate shortlist (status SAVED)")
async def save_job(job_id: str) -> Dict[str, Any]:
    job_data = await get_discovered_job_by_id(job_id)
    app_record = tracker_service.prepare_application(
        job_id=job_id,
        company=job_data.get("company", "Company"),
        role_title=job_data.get("title", "Role"),
        match_score=int(job_data.get("match_score") or 85),
        matched_skills=[],
        missing_skills=[],
        summary=f"Saved job: {job_data.get('title')} at {job_data.get('company')}.",
        cover_letter="",
        job_url=job_data.get("job_url"),
        application_url=job_data.get("application_url"),
        career_page_url=job_data.get("career_page_url"),
        source=job_data.get("source")
    )
    updated = tracker_service.update_application_status(
        application_id=app_record.application_id,
        action="save"
    )
    return {"status": "SAVED", "application": updated}

@router.post("/discovered-jobs/{job_id}/mark-applied", summary="Candidate confirmed manual application submission")
async def mark_job_applied(job_id: str, notes: Optional[str] = Body(None)) -> Dict[str, Any]:
    """
    Explicitly marks job application status as APPLIED in the tracker database.
    Triggered ONLY when candidate explicitly clicks 'I Applied'.
    Does NOT claim JobSearch.ai independently verified submission.
    """
    job_data = await get_discovered_job_by_id(job_id)

    app_record = tracker_service.prepare_application(
        job_id=job_id,
        company=job_data.get("company", "Company"),
        role_title=job_data.get("title", "Role"),
        match_score=int(job_data.get("match_score") or 85),
        matched_skills=[],
        missing_skills=[],
        summary=f"Candidate confirmed manual submission for {job_data.get('title')} at {job_data.get('company')}.",
        cover_letter="",
        job_url=job_data.get("job_url"),
        application_url=job_data.get("application_url"),
        career_page_url=job_data.get("career_page_url"),
        source=job_data.get("source")
    )

    updated = tracker_service.update_application_status(
        application_id=app_record.application_id,
        action="mark_applied",
        notes=notes or "Candidate confirmed manual submission on external website."
    )
    return {
        "status": "APPLIED",
        "confirmation": "user",
        "message": "Status updated to APPLIED based on candidate explicit confirmation.",
        "application": updated
    }

@router.post("/discovered-jobs/{job_id}/mark-not-applied", summary="Candidate declined/did not apply")
async def mark_job_not_applied(job_id: str, payload: Optional[Dict[str, Any]] = Body(None)) -> Dict[str, Any]:
    """
    Explicitly marks job status as NOT_APPLIED when candidate clicks 'Didn't Apply'.
    """
    job_data = await get_discovered_job_by_id(job_id)
    reason = payload.get("reason") if isinstance(payload, dict) else None

    app_record = tracker_service.prepare_application(
        job_id=job_id,
        company=job_data.get("company", "Company"),
        role_title=job_data.get("title", "Role"),
        match_score=int(job_data.get("match_score") or 85),
        matched_skills=[],
        missing_skills=[],
        summary=f"Candidate did not apply to {job_data.get('title')} at {job_data.get('company')}.",
        cover_letter="",
        job_url=job_data.get("job_url"),
        application_url=job_data.get("application_url"),
        career_page_url=job_data.get("career_page_url"),
        source=job_data.get("source")
    )

    updated = tracker_service.update_application_status(
        application_id=app_record.application_id,
        action="mark_not_applied",
        reason=reason
    )
    return {
        "status": "NOT_APPLIED",
        "message": "Status updated to NOT_APPLIED.",
        "application": updated
    }

@router.delete("/discovered-jobs/{job_id}", summary="Remove job from active feed (soft delete status REMOVED)")
async def remove_job(job_id: str) -> Dict[str, Any]:
    """
    Soft deletes job setting status to REMOVED so it is hidden from active feed.
    """
    try:
        job_data = await get_discovered_job_by_id(job_id)
        app_record = tracker_service.prepare_application(
            job_id=job_id,
            company=job_data.get("company", "Company"),
            role_title=job_data.get("title", "Role"),
            match_score=int(job_data.get("match_score") or 85),
            matched_skills=[],
            missing_skills=[],
            summary="Removed job",
            cover_letter="",
            job_url=job_data.get("job_url"),
            application_url=job_data.get("application_url"),
            career_page_url=job_data.get("career_page_url"),
            source=job_data.get("source")
        )
        tracker_service.update_application_status(
            application_id=app_record.application_id,
            action="remove"
        )
    except Exception:
        pass

    return {"status": "REMOVED", "job_id": job_id}
