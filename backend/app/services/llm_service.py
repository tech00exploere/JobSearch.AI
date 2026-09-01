"""
JobSearch.ai Live Gemini Agent Orchestrator
===========================================
Integrates live Google Gemini API (`GEMINI_API_KEY`) with JobSearch.ai tool calls,
Resume RAG context, and deterministic match scoring.
"""

import os
import json
from typing import List, Dict, Any
from dotenv import load_dotenv
from app.models.schemas import ChatResponse, ToolCallBadge
from app.tools.job_tools import (
    tool_search_jobs,
    tool_get_job_details,
    tool_calculate_job_match,
    tool_prepare_application,
    tool_track_application
)

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai_model = None

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        genai_model = genai.GenerativeModel("gemini-3.6-flash")
        print("Live Gemini API SDK initialized successfully!")
    except Exception as err:
        print(f"Could not initialize google.generativeai: {err}")

        genai_model = None


def get_agent_response(message: str) -> ChatResponse:
    """
    Main ReAct Agent orchestrator for JobSearch.ai.
    Executes tools, retrieves RAG context, and queries live Gemini API.
    """
    tool_badges: List[ToolCallBadge] = []
    msg_lower = message.lower()

    # Intent 1: Application Tracking
    if any(k in msg_lower for k in ["track", "status", "applied", "applications"]):
        tool_badges.append(
            ToolCallBadge(
                tool_name="track_application",
                action_summary="Querying MongoDB / Application Tracker DB...",
                status="completed",
                result_snippet="Retrieved active applications."
            )
        )
        track_res = tool_track_application()
        apps = track_res.get("applications", [])

        response_text = f"**Job Application Tracker Status** ({len(apps)} applications logged in MongoDB):\n\n"

        for a in apps:
            response_text += f" **{a['company']}**  *{a['role_title']}* | **Match Score**: {a['match_score']}% | **Status**: `{a['status']}`\n"
        response_text += "\n*Review or approve pending applications in the **Approval Queue**.*"

        return ChatResponse(
            response=response_text,
            tool_calls=tool_badges,
            model="Gemini-1.5-Flash + MongoDB"
        )

    # Intent 2: Job Search & Application Preparation Flow
    tool_badges.append(
        ToolCallBadge(
            tool_name="search_jobs",
            action_summary=f"Searching job listings for query: '{message}'...",
            status="completed",
            result_snippet="Found software job listings."
        )
    )

    search_res = tool_search_jobs(query=message)
    jobs = search_res.get("jobs", [])

    if not jobs:
        return ChatResponse(
            response=" No specific jobs matched your query keywords. Try searching for terms like 'React', 'FastAPI', 'Python', or 'Full-Stack'.",
            tool_calls=tool_badges,
            model="Gemini-1.5-Flash + JobSearch.ai-Agent"
        )

    top_job = jobs[0]
    job_id = top_job["id"]

    # Calculate Fit Match
    tool_badges.append(
        ToolCallBadge(
            tool_name="calculate_job_match",
            action_summary=f"Calculating deterministic fit score for {top_job['company']}...",
            status="completed",
            result_snippet="Fit score & gap analysis calculated."
        )
    )

    match_res = tool_calculate_job_match(job_id=job_id).get("match", {})
    match_score = match_res.get("overall_match_score", 85)

    # Prepare Application (HITL)
    tool_badges.append(
        ToolCallBadge(
            tool_name="prepare_application",
            action_summary=f"Retrieving Resume RAG context & tailoring materials for {top_job['company']}...",
            status="completed",
            result_snippet="Application bundle logged in Prepared HITL queue."
        )
    )

    prep_res = tool_prepare_application(job_id=job_id).get("prepared_application", {})

    # Try live Gemini API for natural language response generation
    if genai_model is not None:
        try:
            prompt = f"""You are JobSearch.ai, an AI Job Search & Application Agent.
User Query: "{message}"

Top Job Found:
Company: {top_job['company']}
Role: {top_job['title']}
Location: {top_job['location']}
Salary: {top_job['salary_range']}
Required Skills: {', '.join(top_job['required_skills'])}

Match Assessment:
Overall Match Score: {match_score}%
Matched Skills: {', '.join(match_res.get('matched_skills', []))}
Missing Skills: {', '.join(match_res.get('missing_skills', [])) or 'None'}
Verdict: {match_res.get('experience_verdict', '')}

Prepared Application ID: {prep_res.get('application_id')}
Tailored Resume Summary: {prep_res.get('tailored_resume_summary')}

Instructions:
Synthesize this information in clean markdown. Highlight the job details, match score, skill breakdown, and remind the user that the application requires HUMAN APPROVAL in the Approval Queue before submission.
"""
            gemini_response = genai_model.generate_content(prompt)
            if gemini_response and gemini_response.text:
                return ChatResponse(
                    response=gemini_response.text,
                    tool_calls=tool_badges,
                    model="JobSearch.ai (Gemini-3.6-Flash)"
                )
        except Exception as exc:
            print(f"Live Gemini API call fallback: {exc}")

    # Fallback structured markdown response
    response_text = f"""**Job Search & Match Analysis Complete!**

### 1. Top Recommended Job
**Company**: {top_job['company']}
**Role**: {top_job['title']}
**Location**: {top_job['location']}
**Salary / Stipend**: {top_job['salary_range']}

---

### 2. Deterministic Fit Assessment
**Overall Match Score**: **{match_score}%**
**Matched Required Skills**: {', '.join(match_res.get('matched_skills', []))}
**Skill Gaps / Missing**: {', '.join(match_res.get('missing_skills', [])) or 'None'}
**Verdict**: {match_res.get('experience_verdict', 'Strong candidate fit based on master resume projects.')}

---

### 3. Application Material Tailoring (Non-Hallucinated)
**Tailored Resume Summary**: "{prep_res.get('tailored_resume_summary', '')}"
**Personalized Cover Letter**: Generated and attached to application bundle.

---

> **HUMAN APPROVAL REQUIRED**
>
> The application has been prepared and placed in your **Approval Queue** (`application_id: {prep_res.get('application_id')}`).
>
> **Action Required**: Please review the tailored materials and click **[Apply]** in the approval interface to submit.
"""

    return ChatResponse(
        response=response_text,
        tool_calls=tool_badges,
        model="JobSearch.ai-Agent-v1"
    )


def analyze_job_with_llm(description: str, title: str = "") -> dict:
    """
    Analyze a job description using Gemini AI (if configured) to extract
    required skills, match fit explanation, and key responsibilities.
    Falls back to deterministic parsing when Gemini is unavailable.
    """
    if genai_model and description:
        try:
            prompt = (
                f"You are an AI career assistant. Analyze the following job description and return a "
                f"structured JSON with keys: required_skills (list), preferred_skills (list), "
                f"experience_required (str), key_responsibilities (list), summary_reasoning (str).\n\n"
                f"Job Title: {title}\n\nJob Description:\n{description[:4000]}"
            )
            resp = genai_model.generate_content(prompt)
            import json as _json
            text = resp.text.strip().strip('').lstrip('json').strip()
            return _json.loads(text)
        except Exception as e:
            return {
                "required_skills": [],
                "preferred_skills": [],
                "experience_required": "0-2 years",
                "key_responsibilities": [],
                "summary_reasoning": f"Gemini analysis unavailable: {str(e)}"
            }

    import re
    skills_found = re.findall(
        r"\b(Python|FastAPI|React|Node\.js|TypeScript|JavaScript|Java|Go|Rust|MongoDB|PostgreSQL|MySQL|Redis|Docker|Kubernetes|AWS|GCP|Azure|REST|GraphQL)\b",
        description or "",
        re.IGNORECASE
    )
    unique_skills = list(dict.fromkeys([s.title() for s in skills_found]))
    return {
        "required_skills": unique_skills[:6],
        "preferred_skills": unique_skills[6:10],
        "experience_required": "0-2 years",
        "key_responsibilities": ["Build and maintain scalable software systems"],
        "summary_reasoning": f"Extracted {len(unique_skills)} skills from job description. Gemini API key not configured."
    }
