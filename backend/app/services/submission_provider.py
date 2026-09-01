from typing import Dict, Any, Optional
from app.job_discovery.url_validator import validate_url
from app.job_discovery.url_resolver import resolve_application_url

class HumanHandoffProvider:
    """
    Human-Controlled External Navigation Provider.
    In JobSearch.ai, final application submission is ALWAYS controlled manually by the candidate
    on the external job portal. JobSearch.ai provides the exact target URL for direct client-side navigation.
    It NEVER pretends that an application was automatically submitted.
    """

    def resolve_target_url(self, record: Dict[str, Any]) -> Optional[str]:
        """Resolves the real external application URL for human manual application."""
        return resolve_application_url(record)

    def route_and_submit(
        self,
        application_record: Dict[str, Any],
        candidate_profile: Dict[str, Any],
        answers: Optional[Dict[str, str]] = None,
        resume_pdf_path: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Resolves external target URL bundle.
        Status is preserved as DISCOVERED / SAVED until explicit candidate confirmation.
        """
        target_url = self.resolve_target_url(application_record)

        if not target_url:
            return {
                "status": application_record.get("status", "DISCOVERED"),
                "method": "Manual External Navigation",
                "details": "Application URL unavailable. Please visit company portal directly.",
                "application_url": None,
                "job_url": validate_url(application_record.get("job_url")),
                "cover_letter": application_record.get("tailored_cover_letter", "")
            }

        return {
            "status": application_record.get("status", "DISCOVERED"),
            "method": "Manual External Navigation",
            "details": f"External target URL resolved: {target_url}.",
            "application_url": target_url,
            "job_url": validate_url(application_record.get("job_url")),
            "cover_letter": application_record.get("tailored_cover_letter", "")
        }

    def get_provider_for_url(self, url: str, has_email: bool = False):
        return self

submission_router = HumanHandoffProvider()
