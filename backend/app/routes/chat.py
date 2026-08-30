"""
Chat Route — POST /api/chat
================================
Main interaction endpoint for JobSetu AI Agent.
"""

from fastapi import APIRouter, HTTPException
from app.models.schemas import ChatRequest, ChatResponse
from app.services.llm_service import get_agent_response

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, summary="Send a message to JobSetu AI Agent")
async def chat(request: ChatRequest) -> ChatResponse:
    """
    Main Agentic Chat Endpoint.
    
    - Accepts user query / job search prompt
    - Triggers JobSetu AI Agent loop (Job Search, JD Analysis, Deterministic Matcher, Resume RAG, Material Tailoring)
    - Returns structured answer + visual tool badges + HITL status
    """
    try:
        return get_agent_response(request.message)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"JobSetu Agent execution failed: {str(exc)}",
        ) from exc
