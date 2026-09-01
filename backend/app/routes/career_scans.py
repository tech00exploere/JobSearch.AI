from fastapi import APIRouter, BackgroundTasks
from app.job_discovery import orchestrator

router = APIRouter()

@router.post("/career-scans")
async def trigger_scan(background_tasks: BackgroundTasks):
    background_tasks.add_task(orchestrator.execute_web_discovery, {})
    return {"status": "queued", "message": "Web job discovery scan started in background"}
