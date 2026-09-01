"""
Model Status Router
"""

from fastapi import APIRouter
from app.models.schemas import ModelStatus

router = APIRouter()


@router.get("/model/status", response_model=ModelStatus, summary="JobSearch.ai Agent metadata")
async def get_model_status() -> ModelStatus:
    """Returns metadata for the JobSearch.ai Controlled Agent Engine"""
    return ModelStatus()
