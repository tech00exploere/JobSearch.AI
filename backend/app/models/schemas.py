"""
Pydantic Schemas for JobSearch.ai — AI Job Search & Application Agent
=====================================================================
Request and response models for Job discovery, JD analysis, Resume RAG,
Deterministic Matching, HITL Approval, and Application Tracking.
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any


# ─── Chat Schemas ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    """Request payload for JobSearch.ai agent chat endpoint"""
    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's query or job search prompt",
        examples=["Find me software engineering internships requiring React and Python in India."],
    )


class ToolCallBadge(BaseModel):
    """Visual tool call step metadata for Next.js UI"""
    tool_name: str
    action_summary: str
    status: Literal["executing", "completed", "failed"] = "completed"
    result_snippet: Optional[str] = None


class ChatResponse(BaseModel):
    """Response payload for JobSearch.ai agent chat endpoint"""
    response: str
    tool_calls: List[ToolCallBadge] = Field(default_factory=list)
    model: str = "JobSearch.ai-Agent-v1"
    status: Literal["mock", "real"] = "real"



# ─── Job Models ───────────────────────────────────────────────────────────────

class JobListing(BaseModel):
    """Structured representation of a Job Listing"""
    id: str
    title: str
    company: str
    location: str
    job_type: str = "Full-Time"
    salary_range: str = "Not specified"
    posted_date: str
    description: str
    required_skills: List[str]
    preferred_skills: List[str] = Field(default_factory=list)
    experience_required: str = "0-1 years"
    responsibilities: List[str] = Field(default_factory=list)
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    career_page_url: Optional[str] = None
    source: Optional[str] = None
    posted_at: Optional[str] = None
    discovered_at: Optional[str] = None


class ParsedJD(BaseModel):
    """Structured output from JD Analyzer"""
    role_title: str
    company: Optional[str] = None
    required_skills: List[str]
    preferred_skills: List[str]
    experience_required: str
    key_responsibilities: List[str]


# ─── Job Matching & Tailoring ─────────────────────────────────────────────────

class JobMatchResult(BaseModel):
    """Deterministic match calculation result"""
    job_id: str
    role_title: str
    company: str
    overall_match_score: int  # 0 to 100 percentage
    skill_coverage_percent: int
    matched_skills: List[str]
    missing_skills: List[str]
    experience_verdict: str
    summary_reasoning: str


class TailoredMaterials(BaseModel):
    """Non-hallucinated tailored application assets"""
    job_id: str
    company: str
    role_title: str
    tailored_summary: str
    highlighted_projects: List[Dict[str, Any]]
    tailored_cover_letter: str
    anti_hallucination_guarantee: bool = True


# ─── Human-in-the-Loop & Tracker ───────────────────────────────────────────────

class PreparedApplication(BaseModel):
    """Application bundle waiting for candidate review"""
    application_id: str
    job_id: str
    company: str
    role_title: str
    match_score: int
    matched_skills: List[str]
    missing_skills: List[str]
    tailored_resume_summary: str
    tailored_cover_letter: str
    status: Literal["DISCOVERED", "SAVED", "VIEWED", "APPLIED", "NOT_APPLIED", "INTERVIEW", "OFFER", "REJECTED", "REMOVED"] = "DISCOVERED"
    created_at: str
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    career_page_url: Optional[str] = None
    source: Optional[str] = None


class FormQuestion(BaseModel):
    field_key: str
    question_text: str
    value: str
    status: Literal["auto_filled", "needs_input", "user_filled"]
    options: Optional[List[str]] = None


class FormMappingResponse(BaseModel):
    application_id: str
    submission_channel: str
    fields: List[FormQuestion]


class SubmitApplicationRequest(BaseModel):
    """Payload sent when candidate explicitly updates job status"""
    application_id: str
    action: Literal["mark_applied", "mark_not_applied", "save", "remove", "skipped"]
    notes: Optional[str] = None
    reason: Optional[str] = None
    mapped_fields: Optional[Dict[str, str]] = None


class ApplicationRecord(BaseModel):
    """Record in Application Tracker DB"""
    application_id: str
    job_id: str
    company: str
    role_title: str
    match_score: int
    status: Literal["DISCOVERED", "SAVED", "VIEWED", "APPLIED", "NOT_APPLIED", "INTERVIEW", "OFFER", "REJECTED", "REMOVED"]
    updated_at: str
    cover_letter_snippet: Optional[str] = None
    submission_channel: Optional[str] = None
    pdf_resume_version: Optional[str] = None
    submitted_at: Optional[str] = None
    applied_at: Optional[str] = None
    not_applied_at: Optional[str] = None
    not_applied_reason: Optional[str] = None
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    career_page_url: Optional[str] = None
    source: Optional[str] = None



# ─── System Health & Status ───────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: Literal["ok", "degraded", "down"] = "ok"
    service: str = "JobSearch.ai Backend"
    version: str = "1.0.0"


class ModelStatus(BaseModel):
    name: str = "JobSearch.ai Agent"
    architecture: str = "ReAct Agent Orchestrator + Resume RAG + Deterministic Matcher"
    parameters: str = "Domain-Specific Agentic Pipeline"
    training_status: str = "active"
    dataset: str = "Jobs & Master Resume RAG"
    version: str = "1.0.0"
    is_mock: bool = False

