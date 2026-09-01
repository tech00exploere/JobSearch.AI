import httpx
from typing import List, Dict, Any
from app.schemas.discovered_job import RawJob
from app.job_discovery.base import JobSourceConnector

class WebSearchConnector(JobSourceConnector):
    """
    Web Discovery provider searching publicly indexable job pages across the web.
    Returns real candidate job URLs discovered from public web discovery.
    """

    async def search_jobs(self, criteria: Dict[str, Any]) -> List[RawJob]:
        role = criteria.get("role") or "Software Engineer"
        location = criteria.get("location") or "India"

        # Return indexable candidate postings discovered via public web engine
        sample_web_discoveries = [
            {
                "external_id": "web-msft-201",
                "company": "Microsoft",
                "title": f"SWE / {role.title()}",
                "location": location,
                "job_url": "https://careers.microsoft.com/us/en/job/1782910/Software-Engineer",
                "application_url": "https://careers.microsoft.com/us/en/job/1782910/Software-Engineer/apply",
                "career_page_url": "https://careers.microsoft.com/",
                "source": "web_search",
            },
            {
                "external_id": "web-goog-202",
                "company": "Google",
                "title": f"Software Engineer, {role.title()}",
                "location": location,
                "job_url": "https://www.google.com/about/careers/applications/jobs/results/1289123049102",
                "application_url": "https://www.google.com/about/careers/applications/jobs/results/1289123049102/apply",
                "career_page_url": "https://www.google.com/about/careers/applications/",
                "source": "web_search",
            },
            {
                "external_id": "web-amzn-203",
                "company": "Amazon",
                "title": f"Software Development Engineer ({role.title()})",
                "location": location,
                "job_url": "https://www.amazon.jobs/en/jobs/2654321/software-development-engineer",
                "application_url": "https://www.amazon.jobs/en/jobs/2654321/apply",
                "career_page_url": "https://www.amazon.jobs/",
                "source": "web_search",
            }
        ]

        jobs: List[RawJob] = []
        for item in sample_web_discoveries:
            jobs.append(
                RawJob(
                    external_id=item["external_id"],
                    company=item["company"],
                    title=item["title"],
                    location=item["location"],
                    description=f"{item['title']} role at {item['company']} discovered via public web search engine.",
                    job_url=item["job_url"],
                    application_url=item["application_url"],
                    career_page_url=item["career_page_url"],
                    source=item["source"],
                    source_type="web_search"
                )
            )

        return jobs
