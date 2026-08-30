"""
Health Check Router
"""

from fastapi import APIRouter
from app.models.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, summary="Backend health check")
async def health_check() -> HealthResponse:
    """Returns status of JobSearch.ai backend service"""
    return HealthResponse(status="ok", service="JobSearch.ai Backend", version="1.0.0")

