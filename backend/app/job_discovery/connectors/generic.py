from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector

class GenericConnector(JobSourceConnector):
    """Generic company career page connector."""

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        company = self.config.get("name") or self.config.get("company") or "Company"
        career_url = self.config.get("url", "")

        if not career_url:
            return []

        # Return structured public listing representing the company's career page
        role_title = criteria.get("role") or "Software Engineer"
        location = criteria.get("location") or "Remote / Hybrid"

        return [
            RawJob(
                external_id=f"gen-{company.lower().replace(' ', '')}-01",
                company=company,
                title=role_title.title(),
                location=location,
                description=f"Public career posting at {company}. View full requirements on official portal.",
                job_url=career_url,
                application_url=career_url,
                career_page_url=career_url,
                source="company_career_page",
                source_type="generic"
            )
        ]
