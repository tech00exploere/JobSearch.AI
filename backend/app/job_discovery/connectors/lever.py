import httpx
from typing import List, Dict, Any
from datetime import datetime
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.url_validator import validate_url

class LeverConnector(JobSourceConnector):
    """Public Lever ATS board connector."""

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        company = self.config.get("name") or self.config.get("company") or ""
        url = self.config.get("url", "")
        if not company and url:
            company = url.rstrip("/").split("/")[-1]

        if not company:
            return []

        company_slug = company.lower().replace(" ", "")
        api_url = f"https://api.lever.co/v0/postings/{company_slug}"

        jobs: List[RawJob] = []
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(api_url, timeout=8)
                if resp.status_code != 200:
                    return []
                data = resp.json()
            except Exception:
                return []

        if not isinstance(data, list):
            return []

        career_url = validate_url(url) or (f"https://jobs.lever.co/{company_slug}" if company_slug else None)

        for item in data:
            ext_id = str(item.get("id")) if item.get("id") else None
            title = item.get("text", "")
            location = item.get("categories", {}).get("location", "")
            hosted_url = validate_url(item.get("hostedUrl"))
            apply_url = validate_url(item.get("applyUrl")) or hosted_url

            posted_dt = None
            if item.get("createdAt"):
                try:
                    posted_dt = datetime.fromtimestamp(item["createdAt"] / 1000.0)
                except Exception:
                    pass

            role_q = (criteria.get("role") or "").lower()
            if role_q and not any(kw in title.lower() for kw in role_q.split()):
                continue

            jobs.append(
                RawJob(
                    external_id=ext_id,
                    company=company.title(),
                    title=title,
                    location=location,
                    description=item.get("description", ""),
                    job_url=hosted_url,
                    application_url=apply_url,
                    career_page_url=career_url,
                    source="lever",
                    source_type="lever",
                    posted_at=posted_dt
                )
            )

        return jobs
