from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any, Union
from app.schemas.discovered_job import RawJob, SourceCapability
from app.job_discovery.models import SearchCriteria

class JobSourceConnector(ABC):
    """
    Abstract base interface for modular job discovery connectors.
    Each connector declares its explicit SourceCapability and implementation.
    """
    name: str = "Generic"
    capability: SourceCapability = SourceCapability.UNAVAILABLE

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    @abstractmethod
    async def search_jobs(self, criteria: Union[SearchCriteria, Dict[str, Any]]) -> List[RawJob]:
        """Execute job search based on criteria. Must return authentic RawJobs or empty list []."""
        raise NotImplementedError
