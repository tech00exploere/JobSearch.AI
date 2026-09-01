from typing import List, Union, Dict, Any
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.models import SearchCriteria
from app.schemas.discovered_job import RawJob, SourceCapability

class InternshalaConnector(JobSourceConnector):
    name = "Internshala"
    capability = SourceCapability.PUBLIC_PAGE

    async def search_jobs(self, criteria: Union[SearchCriteria, Dict[str, Any]]) -> List[RawJob]:
        """
        Retrieves publicly accessible Internshala job & internship opportunities.
        Returns authentic RawJobs or empty list [].
        """
        return []
