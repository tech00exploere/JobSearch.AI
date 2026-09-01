import httpx
from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector

class SmartRecruitersConnector(JobSourceConnector):
    """Public SmartRecruiters ATS board connector."""

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        company = self.config.get("name") or self.config.get("company") or ""
        url = self.config.get("url", "")
        if not company and url:
            company = url.rstrip("/").split("/")[-1]

        if not company:
            return []

        company_slug = company.lower().replace(" ", "")
        api_url = f"https://api.smartrecruiters.com/v1/companies/{company_slug}/postings"

        jobs: List[RawJob] = []
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(api_url, timeout=8)
                if resp.status_code != 200:
                    return []
                data = resp.json()
            except Exception:
                return []

        content = data.get("content", []) if isinstance(data, dict) else []
        career_url = url or f"https://jobs.smartrecruiters.com/{company_slug}"

        for item in content:
            ext_id = str(item.get("id"))
            title = item.get("name", "")
            location = ""
            if isinstance(item.get("location"), dict):
                location = item["location"].get("city", "")

            job_url = f"https://jobs.smartrecruiters.com/{company_slug}/{ext_id}"
            app_url = f"https://jobs.smartrecruiters.com/{company_slug}/{ext_id}/apply"

            role_q = (criteria.get("role") or "").lower()
            if role_q and not any(kw in title.lower() for kw in role_q.split()):
                continue

            jobs.append(
                RawJob(
                    external_id=ext_id,
                    company=company.title(),
                    title=title,
                    location=location,
                    description=title,
                    job_url=job_url,
                    application_url=app_url,
                    career_page_url=career_url,
                    source="smartrecruiters",
                    source_type="smartrecruiters"
                )
            )

        return jobs
