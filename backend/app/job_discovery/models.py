from typing import List, Optional
from pydantic import BaseModel

class SearchCriteria(BaseModel):
    role: str = "Software Engineer"
    location: str = "India"
    experience: Optional[str] = "0-2"
    skills: List[str] = []
    remote: Optional[bool] = None
    job_type: Optional[str] = None  # Full-time, Internship
    work_mode: Optional[str] = None  # Remote, Hybrid, On-site
    posted_within: Optional[str] = None  # 24h, 3d, 7d, 30d
