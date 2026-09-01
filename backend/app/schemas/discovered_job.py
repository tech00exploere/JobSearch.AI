from datetime import datetime
from typing import List, Optional, Literal, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field

class SourceCapability(str, Enum):
    DIRECT_API = "DIRECT_API"
    PUBLIC_PAGE = "PUBLIC_PAGE"
    PUBLIC_SEARCH = "PUBLIC_SEARCH"
    COMPANY_CAREER = "COMPANY_CAREER"
    ATS = "ATS"
    WEB_DISCOVERY = "WEB_DISCOVERY"
    UNAVAILABLE = "UNAVAILABLE"

class SourceDiagnostic(BaseModel):
    name: str
    status: Literal["ok", "warning", "error", "unavailable"] = "ok"
    capability: SourceCapability
    jobs_retrieved: int = 0
    error_message: Optional[str] = None

class DiscoveryDiagnostics(BaseModel):
    total_discovered: int = 0
    after_deduplication: int = 0
    sources: List[SourceDiagnostic] = []

class RawJob(BaseModel):
    id: Optional[str] = None
    external_id: Optional[str] = None
    company: str
    title: str
    location: str = ''
    description: str = ''
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    source_url: Optional[str] = None
    career_page_url: Optional[str] = None
    url: Optional[str] = None
    source: str
    source_type: str = 'api'
    posted_at: Optional[datetime] = None
    discovered_at: datetime = Field(default_factory=datetime.now)

class NormalizedJob(BaseModel):
    id: str
    external_id: Optional[str] = None
    company: str
    title: str
    location: str = ''
    description: str = ''
    job_url: Optional[str] = None
    application_url: Optional[str] = None
    source_url: Optional[str] = None
    career_page_url: Optional[str] = None
    source: str
    source_type: str = 'api'
    sources: List[str] = []
    remote: Optional[bool] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    posted_at: Optional[datetime] = None
    discovered_at: datetime = Field(default_factory=datetime.now)
    fingerprint: str
    skills: List[str] = []
    match_score: Optional[float] = None
    status: Literal["DISCOVERED", "SAVED", "VIEWED", "APPLIED", "NOT_APPLIED", "INTERVIEW", "OFFER", "REJECTED", "REMOVED"] = "DISCOVERED"
    applied_at: Optional[datetime] = None
    not_applied_at: Optional[datetime] = None
    removed_at: Optional[datetime] = None
    not_applied_reason: Optional[str] = None

class JobDiscoveryResponse(BaseModel):
    count: int
    jobs: List[NormalizedJob]
    diagnostics: DiscoveryDiagnostics
