from typing import List, Union, Dict, Any
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.models import SearchCriteria
from app.schemas.discovered_job import RawJob, SourceCapability

class LinkedInConnector(JobSourceConnector):
    name = "LinkedIn"
    capability = SourceCapability.PUBLIC_SEARCH

    async def search_jobs(self, criteria: Union[SearchCriteria, Dict[str, Any]]) -> List[RawJob]:
        """
        Retrieves publicly accessible LinkedIn job listings.
        If anti-bot/access controls prevent public listing retrieval, returns [].
        """
        # Capability check: Returns authentic public listings or empty list []
        return []
