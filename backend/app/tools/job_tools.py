"""
JobSearch.ai Tool Suite — Dedicated AI Agent Tools
=================================================
Exposes authorized tools for Job Discovery, JD Analysis, Resume RAG,
Deterministic Matching, Material Tailoring, and Application Tracking.
"""

from typing import Dict, Any, List, Optional
from app.services.job_service import job_service
from app.services.matching_service import matching_service
from app.services.tracker_service import tracker_service
from app.rag.resume_rag import resume_rag_engine


# ─── Tool Implementations ─────────────────────────────────────────────────────

def tool_search_jobs(query: str = "", location: str = "") -> Dict[str, Any]:
    """1. search_jobs: Search relevant job listings"""
    jobs = job_service.search_jobs(query=query, location=location)
    return {
        "status": "success",
        "count": len(jobs),
        "jobs": [j.model_dump() for j in jobs]
    }


def tool_get_job_details(job_id: str) -> Dict[str, Any]:
    """2. get_job_details: Retrieve full JD and requirements"""
    job = job_service.get_job_details(job_id)
    if not job:
        return {"status": "error", "message": f"Job {job_id} not found."}
    return {"status": "success", "job": job.model_dump()}


def tool_analyze_job_description(jd_text: str) -> Dict[str, Any]:
    """3. analyze_job_description: Parse structured requirements from JD"""
    parsed = matching_service.analyze_job_description(jd_text)
    return {"status": "success", "parsed_jd": parsed.model_dump()}


def tool_get_resume() -> Dict[str, Any]:
    """4. get_resume: Retrieve master resume profile"""
    resume = resume_rag_engine.get_full_resume()
    return {"status": "success", "resume": resume}


def tool_search_resume_context(query: str) -> Dict[str, Any]:
    """5. search_resume_context: RAG vector retrieval over candidate experience"""
    chunks = resume_rag_engine.search_resume_context(query, top_k=3)
    return {"status": "success", "relevant_chunks": chunks}


def tool_calculate_job_match(job_id: str) -> Dict[str, Any]:
    """6. calculate_job_match: Compute deterministic fit score"""
    job = job_service.get_job_details(job_id)
    if not job:
        return {"status": "error", "message": f"Job {job_id} not found."}
    
    match_res = matching_service.calculate_job_match(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )
    return {"status": "success", "match": match_res.model_dump()}


def tool_generate_tailored_resume(job_id: str) -> Dict[str, Any]:
    """7. generate_tailored_resume: Non-hallucinated tailored experience summary"""
    job = job_service.get_job_details(job_id)
    if not job:
        return {"status": "error", "message": f"Job {job_id} not found."}
    
    materials = matching_service.generate_tailored_materials(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )
    return {
        "status": "success",
        "tailored_summary": materials.tailored_summary,
        "highlighted_projects": materials.highlighted_projects
    }


def tool_generate_cover_letter(job_id: str) -> Dict[str, Any]:
    """8. generate_cover_letter: Personalized cover letter grounded in experience"""
    job = job_service.get_job_details(job_id)
    if not job:
        return {"status": "error", "message": f"Job {job_id} not found."}

    materials = matching_service.generate_tailored_materials(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )
    return {"status": "success", "cover_letter": materials.tailored_cover_letter}


def tool_prepare_application(job_id: str) -> Dict[str, Any]:
    """9. prepare_application: Package application materials for candidate review"""
    job = job_service.get_job_details(job_id)
    if not job:
        return {"status": "error", "message": f"Job {job_id} not found."}

    match_res = matching_service.calculate_job_match(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )

    materials = matching_service.generate_tailored_materials(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )

    prep_app = tracker_service.prepare_application(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        match_score=match_res.overall_match_score,
        matched_skills=match_res.matched_skills,
        missing_skills=match_res.missing_skills,
        summary=materials.tailored_summary,
        cover_letter=materials.tailored_cover_letter
    )

    return {
        "status": "success",
        "message": "Application materials prepared. Ready for candidate review and manual application.",
        "prepared_application": prep_app.model_dump()
    }


def tool_update_application_status(application_id: str, action: str = "mark_applied") -> Dict[str, Any]:
    """10. update_application_status: Explicit candidate status update (mark_applied, mark_not_applied, save, remove)"""
    try:
        updated = tracker_service.update_application_status(application_id, action)
        return {"status": "success", "application": updated}
    except Exception as exc:
        return {"status": "error", "message": str(exc)}


def tool_track_application() -> Dict[str, Any]:
    """11. track_application: Retrieve list of all tracked job applications"""
    apps = tracker_service.list_applications()
    return {
        "status": "success",
        "count": len(apps),
        "applications": [a.model_dump() for a in apps]
    }


# ─── Tool Registry Map ────────────────────────────────────────────────────────

JOBSEARCH_TOOLS = {
    "search_jobs": tool_search_jobs,
    "get_job_details": tool_get_job_details,
    "analyze_job_description": tool_analyze_job_description,
    "get_resume": tool_get_resume,
    "search_resume_context": tool_search_resume_context,
    "calculate_job_match": tool_calculate_job_match,
    "generate_tailored_resume": tool_generate_tailored_resume,
    "generate_cover_letter": tool_generate_cover_letter,
    "prepare_application": tool_prepare_application,
    "update_application_status": tool_update_application_status,
    "track_application": tool_track_application,
}
