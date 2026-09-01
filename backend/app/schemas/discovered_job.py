from datetime import datetime
from typing import List, Optional, Literal
from pydantic import BaseModel

class RawJob(BaseModel):
    id: Optional[str] = None
    external_id: Optional[str] = None
    company: str
    title: str
    location: str = ''
    description: str = ''
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    career_page_url: Optional[str] = None
    url: Optional[str] = None
    source: str
    source_type: str = 'api'
    posted_at: Optional[datetime] = None
    discovered_at: datetime = datetime.now()

class NormalizedJob(BaseModel):
    id: str
    external_id: Optional[str] = None
    company: str
    title: str
    location: str = ''
    description: str = ''
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    career_page_url: Optional[str] = None
    source: str
    source_type: str = 'api'
    sources: List[str] = []
    remote: Optional[bool] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    posted_at: Optional[datetime] = None
    discovered_at: datetime = datetime.now()
    fingerprint: str
    skills: List[str] = []
    match_score: Optional[float] = None
    status: Literal["DISCOVERED", "SAVED", "VIEWED", "APPLIED", "NOT_APPLIED", "INTERVIEW", "OFFER", "REJECTED", "REMOVED"] = "DISCOVERED"
    applied_at: Optional[datetime] = None
    not_applied_at: Optional[datetime] = None
    removed_at: Optional[datetime] = None
    not_applied_reason: Optional[str] = None
