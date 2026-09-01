import httpx
from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.url_validator import validate_url

class GreenhouseConnector(JobSourceConnector):
    """Public Greenhouse ATS board connector."""

    def __init__(self, config: Dict[str, Any] = None):
        super().__init__(config)
        company = self.config.get("name") or self.config.get("company") or ""
        url = self.config.get("url", "")
        if not company and url:
            company = url.rstrip("/").split("/")[-1]
        self.company_slug = company.lower().replace(" ", "")
        self.api_url = f"https://boards-api.greenhouse.io/v1/boards/{self.company_slug}/jobs"

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        if not self.company_slug:
            return []

        company_display = self.config.get("name") or self.company_slug.title()
        career_url = validate_url(self.config.get("url")) or (f"https://boards.greenhouse.io/{self.company_slug}" if self.company_slug else None)

        jobs: List[RawJob] = []
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(self.api_url, timeout=8)
                if resp.status_code != 200:
                    return []
                data = resp.json()
            except Exception:
                return []

        job_items = data.get("jobs", []) if isinstance(data, dict) else (data if isinstance(data, list) else [])

        for item in job_items:
            ext_id = str(item.get("id")) if item.get("id") else None
            title = item.get("title", "")
            location = ""
            if isinstance(item.get("location"), dict):
                location = item["location"].get("name", "")

            # Extract absolute_url from API payload
            raw_url = item.get("absolute_url")
            job_url = validate_url(raw_url)
            app_url = job_url  # Greenhouse job detail pages embed application form

            role_q = (criteria.get("role") or "").lower()
            if role_q and not any(kw in title.lower() for kw in role_q.split()):
                continue

            jobs.append(
                RawJob(
                    external_id=ext_id,
                    company=company_display,
                    title=title,
                    location=location,
                    description=item.get("content", ""),
                    job_url=job_url,
                    application_url=app_url,
                    career_page_url=career_url,
                    source="greenhouse",
                    source_type="greenhouse"
                )
            )

        return jobs
