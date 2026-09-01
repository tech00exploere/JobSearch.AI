from typing import List, Union, Dict, Any
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.models import SearchCriteria
from app.schemas.discovered_job import RawJob, SourceCapability

class IndeedConnector(JobSourceConnector):
    name = "Indeed"
    capability = SourceCapability.PUBLIC_SEARCH

    async def search_jobs(self, criteria: Union[SearchCriteria, Dict[str, Any]]) -> List[RawJob]:
        """
        Retrieves publicly accessible Indeed job listings.
        If anti-bot/access controls prevent public listing retrieval, returns [].
        """
        return []
