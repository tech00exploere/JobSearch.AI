import json
from pathlib import Path
from fastapi import APIRouter
from app.db.mongo_client import get_database

router = APIRouter()

@router.get("/discovered-jobs")
async def get_discovered_jobs(limit: int = 100):
    try:
        db = get_database()
        coll = db["discovered_jobs"]
        jobs = list(coll.find({}, {"_id": 0}).limit(limit))
        return {"jobs": jobs, "source": "mongodb"}
    except Exception:
        # Fallback to JSON file if MongoDB is unavailable
        fallback_path = Path(__file__).resolve().parents[2] / "data" / "discovered_jobs.json"
        if fallback_path.is_file():
            try:
                with open(fallback_path, "r", encoding="utf-8") as f:
                    jobs = json.load(f)
                return {"jobs": jobs[:limit], "source": "json"}
            except Exception:
                pass
        return {"jobs": [], "source": "empty"}
