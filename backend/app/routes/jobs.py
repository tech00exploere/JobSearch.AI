"""
Jobs & Applications Router — REST API Endpoints
=================================================
Provides endpoints for Job Discovery, JD Matching, Resume RAG,
HITL Application Preparation/Approval, and Tracker DB logging.
"""

import os
from fastapi import APIRouter, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse
from typing import List, Optional, Dict, Any
from app.models.schemas import (
    JobListing,
    JobMatchResult,
    PreparedApplication,
    SubmitApplicationRequest,
    ApplicationRecord
)
from app.services.job_service import job_service
from app.services.matching_service import matching_service
from app.services.tracker_service import tracker_service
from app.rag.resume_rag import resume_rag_engine
from app.services.resume_parser_service import resume_parser_service

router = APIRouter()

# Path where the uploaded resume PDF is stored on disk
RESUME_PDF_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "resume.pdf")
RESUME_PDF_PATH = os.path.abspath(RESUME_PDF_PATH)


@router.get("/jobs/search", response_model=List[JobListing], summary="Search job listings")
async def search_jobs(
    query: Optional[str] = Query(None, description="Keywords, technologies, or job title"),
    location: Optional[str] = Query(None, description="City, country, or Remote")
) -> List[JobListing]:
    """Search job listings by query and location"""
    return job_service.search_jobs(query=query, location=location)


@router.get("/jobs/{job_id}", response_model=JobListing, summary="Get job details")
async def get_job_details(job_id: str) -> JobListing:
    """Fetch full JD and requirements for a given job ID"""
    job = job_service.get_job_details(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")
    return job


@router.post("/jobs/match", response_model=JobMatchResult, summary="Calculate deterministic job fit score")
async def calculate_match(job_id: str = Query(...)) -> JobMatchResult:
    """Calculate deterministic skill match score and gap analysis"""
    job = job_service.get_job_details(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")

    return matching_service.calculate_job_match(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        required_skills=job.required_skills
    )


@router.post("/jobs/prepare", response_model=PreparedApplication, summary="Prepare application bundle for HITL review")
async def prepare_application(job_id: str = Query(...)) -> PreparedApplication:
    """Generates tailored resume summary + cover letter and logs into Prepared (HITL) queue"""
    job = job_service.get_job_details(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found.")

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

    return tracker_service.prepare_application(
        job_id=job.id,
        company=job.company,
        role_title=job.title,
        match_score=match_res.overall_match_score,
        matched_skills=match_res.matched_skills,
        missing_skills=match_res.missing_skills,
        summary=materials.tailored_summary,
        cover_letter=materials.tailored_cover_letter
    )


from app.models.schemas import FormQuestion, FormMappingResponse

@router.get("/applications/{application_id}/form", response_model=FormMappingResponse, summary="Get mapped form questions for an application")
async def get_application_form(application_id: str) -> FormMappingResponse:
    """Fetch auto-filled and missing application questions for human HITL review"""
    app_record = tracker_service.get_application(application_id)
    if not app_record:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found.")

    from app.services.mapping_service import mapping_service
    from app.services.submission_provider import submission_router

    # Determine url and infer channel
    job_url = app_record.get("job_url", "")
    if not job_url:
        job = job_service.get_job_details(app_record.get("job_id", ""))
        if job:
            job_url = getattr(job, "url", "")

    has_email = bool(app_record.get("apply_email", ""))
    provider = submission_router.get_provider_for_url(job_url, has_email=has_email)
    
    # Degradation check
    channel_name = provider.__class__.__name__.replace("Provider", "")
    if provider.is_supported(job_url) and not provider.can_submit(job_url):
        channel_name = "Manual Handoff (Degraded)"
    else:
        # Give user-friendly names
        if channel_name == "Lever":
            channel_name = "Lever API (Mocked)" if not os.getenv("LEVER_API_KEY") else "Lever API"
        elif channel_name == "Greenhouse":
            channel_name = "Greenhouse API (Mocked)" if not os.getenv("GREENHOUSE_TOKEN") else "Greenhouse API"
        elif channel_name == "Email":
            channel_name = "Email (Mocked)" if not os.getenv("SMTP_USER") else "Email"
        else:
            channel_name = "Manual Browser Handoff"

    # Fetch candidate profile
    profile = resume_rag_engine.get_full_resume()
    fields = mapping_service.get_questions_for_channel(channel_name, profile)

    return FormMappingResponse(
        application_id=application_id,
        submission_channel=channel_name,
        fields=fields
    )


@router.post("/jobs/approve", summary="Human-in-the-Loop decision execution ([Apply] / [Skip])")
async def approve_application(request: SubmitApplicationRequest) -> Dict[str, Any]:
    """Requires explicit human approval to submit application"""
    try:
        app_record = tracker_service.get_application(request.application_id)
        if not app_record:
            raise HTTPException(status_code=404, detail=f"Application {request.application_id} not found.")

        status = request.action
        notes = request.notes or ""
        channel = None
        answers = request.mapped_fields or {}

        # If action is 'approved', route to submission_router
        if request.action == "approved":
            from app.services.submission_provider import submission_router
            
            candidate_profile = resume_rag_engine.get_full_resume()
            
            res = submission_router.route_and_submit(
                application_record=app_record,
                candidate_profile=candidate_profile,
                answers=answers,
                resume_pdf_path=RESUME_PDF_PATH
            )
            status = res["status"]
            notes_addon = f"{res['method']}: {res['details']}"
            notes = f"{notes}\n{notes_addon}".strip() if notes else notes_addon
            channel = res["method"]

        import datetime
        timestamp_now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        resume_version = "resume.pdf" if os.path.exists(RESUME_PDF_PATH) else "master_resume.json"

        return tracker_service.submit_application(
            application_id=request.application_id,
            action=status,
            notes=notes,
            submission_channel=channel,
            pdf_resume_version=resume_version if status in ["Submitted", "Handoff"] else None,
            submitted_at=timestamp_now if status in ["Submitted", "Handoff"] else None,
            mapped_answers_supplied=answers if answers else None
        )
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))




@router.get("/applications", response_model=List[ApplicationRecord], summary="Get application tracker history")
async def list_applications() -> List[ApplicationRecord]:
    """Retrieve full application tracking pipeline records"""
    return tracker_service.list_applications()


@router.delete("/applications/{application_id}", summary="Delete a specific application record")
async def delete_application(application_id: str) -> Dict[str, Any]:
    """Delete a single application from the tracker database by ID"""
    deleted = tracker_service.delete_application(application_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Application {application_id} not found.")
    return {"status": "deleted", "application_id": application_id}


@router.delete("/applications", summary="Clear all applications and reset to baseline")
async def clear_applications() -> Dict[str, Any]:
    """Reset the tracker database to the initial mock baseline records"""
    tracker_service.clear_applications()
    return {"status": "cleared", "message": "Tracker database has been reset to baseline."}


@router.get("/resume", summary="Get candidate master resume profile")
async def get_master_resume() -> Dict[str, Any]:
    """Retrieve master resume profile used for RAG grounding"""
    return resume_rag_engine.get_full_resume()


@router.put("/resume", summary="Update candidate master resume profile")
async def update_master_resume(new_resume: Dict[str, Any]) -> Dict[str, Any]:
    """Update master resume profile and re-index the RAG engine"""
    try:
        resume_rag_engine.update_resume(new_resume)
        return {"status": "success", "message": "Resume updated and re-indexed successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update resume: {str(e)}")


@router.get("/resume/pdf", summary="Download the stored candidate resume PDF")
async def get_resume_pdf():
    """Serve the stored resume PDF file for download/preview"""
    if not os.path.exists(RESUME_PDF_PATH):
        raise HTTPException(status_code=404, detail="No resume PDF has been uploaded yet.")
    return FileResponse(
        path=RESUME_PDF_PATH,
        media_type="application/pdf",
        filename="resume.pdf",
        headers={"Content-Disposition": "inline; filename=resume.pdf"}
    )


@router.post("/resume/upload", summary="Upload a resume file and parse it using Affinda AI")
async def upload_and_parse_resume(file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload PDF or text resume, parse into master resume JSON schema via Affinda, save PDF, and update RAG index"""
    try:
        content = await file.read()
        filename = (file.filename or "resume.pdf").lower()

        if not filename.endswith((".pdf", ".txt", ".md")):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file format. Please upload a PDF, TXT, or MD file."
            )

        if not content:
            raise HTTPException(status_code=400, detail="The uploaded file is empty.")

        # 1. Save PDF to disk (only for PDF uploads)
        if filename.endswith(".pdf"):
            os.makedirs(os.path.dirname(RESUME_PDF_PATH), exist_ok=True)
            with open(RESUME_PDF_PATH, "wb") as f:
                f.write(content)

        # 2. Parse using Affinda (send raw bytes directly — Affinda handles PDF + TXT natively)
        parsed_resume = resume_parser_service.parse_resume_bytes(content, filename=filename)

        # 3. Save the parsed resume JSON and update RAG index
        resume_rag_engine.update_resume(parsed_resume)

        return {
            "status": "success",
            "message": "Resume uploaded, parsed by Affinda AI, and saved!",
            "pdf_stored": filename.endswith(".pdf"),
            "parsed_data": parsed_resume,
        }
    except HTTPException:
        raise
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to process resume: {str(exc)}")
