from typing import List, Union, Dict, Any
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.models import SearchCriteria
from app.schemas.discovered_job import RawJob, SourceCapability

class NaukriConnector(JobSourceConnector):
    name = "Naukri"
    capability = SourceCapability.PUBLIC_SEARCH

    async def search_jobs(self, criteria: Union[SearchCriteria, Dict[str, Any]]) -> List[RawJob]:
        """
        Retrieves publicly accessible Naukri.com job listings.
        Returns authentic RawJobs or empty list [].
        """
        return []
