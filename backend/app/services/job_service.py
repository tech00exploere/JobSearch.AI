"""
Job Search Service — Job Listing Repository & Search Engine
=============================================================
Manages job discovery, search queries, deduplication, and detailed fetching.
"""

import json
import os
from typing import List, Dict, Any, Optional
from app.models.schemas import JobListing


class JobService:
    def __init__(self, jobs_path: str = None):
        if jobs_path is None:
            jobs_path = os.path.join(os.path.dirname(__file__), "../data/jobs_db.json")
        self.jobs_path = jobs_path
        self.jobs: List[Dict[str, Any]] = self._load_jobs()

    def _load_jobs(self) -> List[Dict[str, Any]]:
        """Loads job database"""
        if not os.path.exists(self.jobs_path):
            return []
        with open(self.jobs_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def search_jobs(
        self,
        query: Optional[str] = None,
        location: Optional[str] = None,
        job_type: Optional[str] = None
    ) -> List[JobListing]:
        """
        Searches job listings by query (keywords, title, skills, description) and location.
        """
        results = []
        q_lower = query.lower() if query else ""
        loc_lower = location.lower() if location else ""

        for j in self.jobs:
            # Match query against title, skills, description
            searchable_text = (
                j["title"] + " " +
                j["company"] + " " +
                j["description"] + " " +
                " ".join(j["required_skills"]) + " " +
                " ".join(j.get("preferred_skills", []))
            ).lower()

            match_q = True if not q_lower else any(word in searchable_text for word in q_lower.split())
            match_loc = True if not loc_lower else loc_lower in j["location"].lower() or "remote" in j["location"].lower()

            if match_q and match_loc:
                results.append(JobListing(**j))

        # Fallback: if no exact keyword matched, return top available jobs
        if not results and self.jobs:
            results = [JobListing(**j) for j in self.jobs[:3]]

        return results

    def get_job_details(self, job_id: str) -> Optional[JobListing]:
        """Fetches job details by ID"""
        for j in self.jobs:
            if j["id"] == job_id:
                return JobListing(**j)
        return None


job_service = JobService()
