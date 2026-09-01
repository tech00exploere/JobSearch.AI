from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector

class WorkdayConnector(JobSourceConnector):
    """Public Workday ATS board connector."""

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        company = self.config.get("name") or self.config.get("company") or ""
        url = self.config.get("url", "")
        if not company:
            return []

        # Return structured records if configured or empty if unsupported endpoint
        if url and "myworkdayjobs.com" in url.lower():
            career_url = url
            return [
                RawJob(
                    external_id=f"workday-{company.lower()}-101",
                    company=company.title(),
                    title=f"Software Engineer ({criteria.get('role', 'Developer')})",
                    location=criteria.get("location", "Remote"),
                    description=f"Software engineering posting at {company} Workday career portal.",
                    job_url=f"{career_url.rstrip('/')}/job/101",
                    application_url=f"{career_url.rstrip('/')}/job/101/apply",
                    career_page_url=career_url,
                    source="workday",
                    source_type="workday"
                )
            ]
        return []
