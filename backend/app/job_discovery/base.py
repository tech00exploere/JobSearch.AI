from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from app.schemas.discovered_job import RawJob

class JobSourceConnector(ABC):
    """Abstract base interface for modular job discovery connectors."""

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    @abstractmethod
    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        """Execute job search based on criteria dictionary (role, location, skills, experience, remote, job_type)."""
        raise NotImplementedError
