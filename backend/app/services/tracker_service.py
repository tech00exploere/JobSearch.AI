"""
Application Tracker Database & Service  HITL & Status Management
=====================================================================
Supports local MongoDB storage (`mongodb://localhost:27017/jobsetu`)
with fallback to JSON database.
"""

import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv
from app.models.schemas import PreparedApplication, ApplicationRecord

load_dotenv()

MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb+srv://mayidoit0_db_user:VLBT8hdKtAFzlwtY@cluster0.y9f4ysj.mongodb.net/?appName=Cluster0"
)


class TrackerService:
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = os.path.join(os.path.dirname(__file__), "../data/applications_db.json")
        self.db_path = db_path
        self.use_mongo = False
        self.collection = None

        # Attempt connection to local MongoDB
        try:
            import pymongo
            client = pymongo.MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            client.admin.command('ping')
            db = client.get_database()
            self.collection = db["applications"]
            self.use_mongo = True
            print(f" Connected to MongoDB at {MONGO_URI}")
        except Exception as err:
            print(f" MongoDB offline or unreachable ({err}). Using persistent JSON storage.")
            self.use_mongo = False

        self.applications: Dict[str, Dict[str, Any]] = self._load_db()

    def _load_db(self) -> Dict[str, Dict[str, Any]]:
        """Loads database from MongoDB or local JSON fallback"""
        if self.use_mongo and self.collection is not None:
            try:
                docs = list(self.collection.find({}, {"_id": 0}))
                if docs:
                    return {d["application_id"]: d for d in docs}
            except Exception:
                pass

        if not os.path.exists(self.db_path):
            initial_db = {
                "app-101": {
                    "application_id": "app-101",
                    "job_id": "job-101",
                    "company": "NexusTech India",
                    "role_title": "Software Engineer Intern (Full-Stack)",
                    "match_score": 87,
                    "matched_skills": ["React.js", "Node.js", "JavaScript", "TypeScript", "REST APIs", "Git"],
                    "missing_skills": [],
                    "tailored_resume_summary": "Full-Stack Engineer with React, Node.js, and REST API experience.",
                    "tailored_cover_letter": "Dear Hiring Manager at NexusTech India...\n\nI am writing to express my interest in the Software Engineer Intern role.",
                    "status": "Prepared",
                    "created_at": "2026-08-30 20:00:00",
                    "updated_at": "2026-08-30 20:00:00"
                },
                "app-102": {
                    "application_id": "app-102",
                    "job_id": "job-102",
                    "company": "Kritrim Innovations",
                    "role_title": "AI / ML Full-Stack Engineer",
                    "match_score": 92,
                    "matched_skills": ["Python", "FastAPI", "Next.js", "TypeScript", "PyTorch", "RAG"],
                    "missing_skills": ["PostgreSQL"],
                    "tailored_resume_summary": "AI Engineer skilled in FastAPI, PyTorch, RAG, and Next.js.",
                    "tailored_cover_letter": "Dear Hiring Manager at Kritrim Innovations...\n\nI am excited about the AI / ML Full-Stack Engineer role.",
                    "status": "Submitted",
                    "created_at": "2026-08-29 14:30:00",
                    "updated_at": "2026-08-29 15:00:00"
                }
            }
            self._save_db(initial_db)
            return initial_db

        with open(self.db_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_db(self, data: Dict[str, Dict[str, Any]]):
        """Saves to MongoDB and local JSON fallback"""
        if self.use_mongo and self.collection is not None:
            try:
                for app_id, record in data.items():
                    self.collection.replace_one({"application_id": app_id}, record, upsert=True)
            except Exception as err:
                print(f"MongoDB write error: {err}")

        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)

    def prepare_application(
        self,
        job_id: str,
        company: str,
        role_title: str,
        match_score: int,
        matched_skills: List[str],
        missing_skills: List[str],
        summary: str,
        cover_letter: str
    ) -> PreparedApplication:
        app_id = f"app-{job_id.replace('job-', '')}-{int(datetime.now().timestamp())}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        app_record = {
            "application_id": app_id,
            "job_id": job_id,
            "company": company,
            "role_title": role_title,
            "match_score": match_score,
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "tailored_resume_summary": summary,
            "tailored_cover_letter": cover_letter,
            "status": "Prepared",
            "created_at": now_str,
            "updated_at": now_str
        }

        self.applications[app_id] = app_record
        self._save_db(self.applications)

        return PreparedApplication(
            application_id=app_id,
            job_id=job_id,
            company=company,
            role_title=role_title,
            match_score=match_score,
            matched_skills=matched_skills,
            missing_skills=missing_skills,
            tailored_resume_summary=summary,
            tailored_cover_letter=cover_letter,
            status="Prepared",
            created_at=now_str
        )

    def submit_application(
        self,
        application_id: str,
        action: str,
        notes: Optional[str] = None,
        submission_channel: Optional[str] = None,
        pdf_resume_version: Optional[str] = None,
        submitted_at: Optional[str] = None,
        mapped_answers_supplied: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        if application_id not in self.applications:
            raise KeyError(f"Application {application_id} not found in database.")

        app = self.applications[application_id]
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        if action == "approved":
            app["status"] = "Submitted"
        elif action == "skipped":
            app["status"] = "Skipped"
        else:
            app["status"] = action.title()

        app["updated_at"] = now_str
        if notes:
            app["notes"] = notes
            
        if submission_channel:
            app["submission_channel"] = submission_channel
        if pdf_resume_version:
            app["pdf_resume_version"] = pdf_resume_version
        if submitted_at:
            app["submitted_at"] = submitted_at
        if mapped_answers_supplied:
            app["mapped_answers_supplied"] = mapped_answers_supplied

        self._save_db(self.applications)
        return app

    def list_applications(self) -> List[ApplicationRecord]:
        records = []
        for app in self.applications.values():
            records.append(
                ApplicationRecord(
                    application_id=app["application_id"],
                    job_id=app["job_id"],
                    company=app["company"],
                    role_title=app["role_title"],
                    match_score=app.get("match_score", 0),
                    status=app["status"],
                    updated_at=app.get("updated_at", app.get("created_at", "")),
                    cover_letter_snippet=app.get("tailored_cover_letter", "")[:150],
                    submission_channel=app.get("submission_channel"),
                    pdf_resume_version=app.get("pdf_resume_version"),
                    submitted_at=app.get("submitted_at"),
                    mapped_answers_supplied=app.get("mapped_answers_supplied")
                )
            )
        records.sort(key=lambda x: x.updated_at, reverse=True)
        return records


    def get_application(self, application_id: str) -> Optional[Dict[str, Any]]:
        return self.applications.get(application_id)

    def delete_application(self, application_id: str) -> bool:
        """Delete a single application record by ID. Returns True if deleted, False if not found."""
        if application_id not in self.applications:
            return False

        del self.applications[application_id]

        # Persist deletion to MongoDB if available
        if self.use_mongo and self.collection is not None:
            try:
                self.collection.delete_one({"application_id": application_id})
            except Exception as err:
                print(f"MongoDB delete error: {err}")

        # Persist to JSON
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with open(self.db_path, "w", encoding="utf-8") as f:
            json.dump(self.applications, f, indent=2)

        return True

    def clear_applications(self) -> None:
        """Reset the applications database to the initial mock baseline."""
        initial_db = {
            "app-101": {
                "application_id": "app-101",
                "job_id": "job-101",
                "company": "NexusTech India",
                "role_title": "Software Engineer Intern (Full-Stack)",
                "match_score": 87,
                "matched_skills": ["React.js", "Node.js", "JavaScript", "TypeScript", "REST APIs", "Git"],
                "missing_skills": [],
                "tailored_resume_summary": "Full-Stack Engineer with React, Node.js, and REST API experience.",
                "tailored_cover_letter": "Dear Hiring Manager at NexusTech India...\n\nI am writing to express my interest in the Software Engineer Intern role.",
                "status": "Prepared",
                "created_at": "2026-08-30 20:00:00",
                "updated_at": "2026-08-30 20:00:00"
            },
            "app-102": {
                "application_id": "app-102",
                "job_id": "job-102",
                "company": "Kritrim Innovations",
                "role_title": "AI / ML Full-Stack Engineer",
                "match_score": 92,
                "matched_skills": ["Python", "FastAPI", "Next.js", "TypeScript", "PyTorch", "RAG"],
                "missing_skills": ["PostgreSQL"],
                "tailored_resume_summary": "AI Engineer skilled in FastAPI, PyTorch, RAG, and Next.js.",
                "tailored_cover_letter": "Dear Hiring Manager at Kritrim Innovations...\n\nI am excited about the AI / ML Full-Stack Engineer role.",
                "status": "Submitted",
                "created_at": "2026-08-29 14:30:00",
                "updated_at": "2026-08-29 15:00:00"
            }
        }

        self.applications = initial_db

        # Reset MongoDB if available
        if self.use_mongo and self.collection is not None:
            try:
                self.collection.drop()
                for app_id, record in initial_db.items():
                    self.collection.insert_one({**record})
            except Exception as err:
                print(f"MongoDB clear error: {err}")

        self._save_db(self.applications)


tracker_service = TrackerService()
