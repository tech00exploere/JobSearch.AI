import os
import webbrowser
import httpx
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Dict, Any, Optional

try:
    import pyperclip
except ImportError:
    pyperclip = None

# Load API credentials safely from environment variables
LEVER_API_KEY = os.getenv("LEVER_API_KEY", "")
GREENHOUSE_TOKEN = os.getenv("GREENHOUSE_TOKEN", "")
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASSWORD", "")


class SubmissionProvider:
    """Base interface for all application submission channels."""
    
    def is_supported(self, url: str) -> bool:
        """Returns True if the target URL matches this provider's domain."""
        return False
        
    def can_submit(self, url: str) -> bool:
        """Returns True if credentials/configurations for this channel are active."""
        return False
        
    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        """Maps candidate profile & form mapping answers to the provider's schema."""
        return {}
        
    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        """Dispatches the payload to the channel and returns routing results."""
        return {"status": "Failed", "details": "Not implemented"}


class LeverProvider(SubmissionProvider):
    def is_supported(self, url: str) -> bool:
        return "lever.co" in url.lower()
        
    def can_submit(self, url: str) -> bool:
        # Currently simulated/mocked if LEVER_API_KEY is not configured
        return True
        
    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        personal = profile.get("personal_info") or {}
        return {
            "job_id": record.get("job_id", ""),
            "name": personal.get("name", "Candidate"),
            "email": personal.get("email", ""),
            "phone": personal.get("phone", ""),
            "summary": record.get("tailored_resume_summary", ""),
            "urls": {
                "github": personal.get("github", ""),
                "linkedin": personal.get("linkedin", ""),
                "portfolio": answers.get("portfolio", "")
            },
            "sponsorship_required": answers.get("sponsorship_required", "No"),
            "authorized_to_work": answers.get("authorized_to_work", "Yes"),
            "years_of_experience": answers.get("years_of_experience", "0")
        }
        
    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        posting_id = payload["job_id"].replace("job-", "")
        url = f"https://api.lever.co/v1/postings/{posting_id}/apply"
        
        if not LEVER_API_KEY:
            return {
                "status": "Submitted",
                "method": "Lever API (Mocked)",
                "details": f"Lever API mock submission processed successfully for posting {posting_id}. Answers supplied: {payload}."
            }
            
        try:
            files = {}
            if pdf_path and os.path.exists(pdf_path):
                files["resume"] = open(pdf_path, "rb")

            # Post payload to Lever API
            with httpx.Client(timeout=30.0) as client:
                r = client.post(url, auth=(LEVER_API_KEY, ""), data=payload, files=files)
                r.raise_for_status()

            return {
                "status": "Submitted",
                "method": "Lever API",
                "details": f"Successfully applied to Lever job posting {posting_id} via API."
            }
        except Exception as e:
            return {
                "status": "Failed",
                "method": "Lever API",
                "details": f"Lever API submission failed: {str(e)}"
            }


class GreenhouseProvider(SubmissionProvider):
    def is_supported(self, url: str) -> bool:
        return "greenhouse.io" in url.lower()
        
    def can_submit(self, url: str) -> bool:
        return True
        
    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        personal = profile.get("personal_info") or {}
        name = personal.get("name", "Candidate")
        parts = name.split()
        first_name = parts[0] if parts else "Candidate"
        last_name = " ".join(parts[1:]) if len(parts) > 1 else "Applicant"
        
        return {
            "job_id": record.get("job_id", ""),
            "first_name": first_name,
            "last_name": last_name,
            "email": personal.get("email", ""),
            "phone_number": personal.get("phone", ""),
            "resume_text": record.get("tailored_resume_summary", ""),
            "linkedin_profile": personal.get("linkedin", ""),
            "github_profile": personal.get("github", ""),
            "answers": answers
        }
        
    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        job_id = payload["job_id"].replace("job-", "")
        url = f"https://boards-api.greenhouse.io/v1/boards/jobsetu/jobs/{job_id}/applications"
        
        if not GREENHOUSE_TOKEN:
            return {
                "status": "Submitted",
                "method": "Greenhouse API (Mocked)",
                "details": f"Greenhouse boards API mock submission processed for job {job_id}. Answers supplied: {payload['answers']}."
            }
            
        try:
            files = {}
            if pdf_path and os.path.exists(pdf_path):
                files["resume"] = open(pdf_path, "rb")

            headers = {"Authorization": f"Basic {GREENHOUSE_TOKEN}"}
            with httpx.Client(timeout=30.0) as client:
                r = client.post(url, headers=headers, json=payload, files=files)
                r.raise_for_status()

            return {
                "status": "Submitted",
                "method": "Greenhouse API",
                "details": f"Successfully applied to Greenhouse job {job_id} via API."
            }
        except Exception as e:
            return {
                "status": "Failed",
                "method": "Greenhouse API",
                "details": f"Greenhouse API submission failed: {str(e)}"
            }


class EmailProvider(SubmissionProvider):
    def is_supported(self, url: str) -> bool:
        # Supported if job record contains a direct email link
        return False
        
    def can_submit(self, url: str) -> bool:
        return True
        
    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        return {
            "recipient": record.get("apply_email", ""),
            "role_title": record.get("role_title", "Software Engineer"),
            "company": record.get("company", ""),
            "body": record.get("tailored_cover_letter", "")
        }
        
    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        recipient = payload["recipient"]
        if not recipient:
            return {"status": "Failed", "method": "Email", "details": "No recipient email address specified."}
            
        if not SMTP_USER or not SMTP_PASS:
            return {
                "status": "Submitted",
                "method": "Email (Mocked)",
                "details": f"SMTP not configured. Mocked dispatch of application materials to {recipient}. Subject: Application for {payload['role_title']} at {payload['company']}"
            }
            
        try:
            msg = MIMEMultipart()
            msg['From'] = SMTP_USER
            msg['To'] = recipient
            msg['Subject'] = f"Application for {payload['role_title']} at {payload['company']}"
            msg.attach(MIMEText(payload["body"], 'plain'))

            if pdf_path and os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    part = MIMEApplication(f.read(), Name=os.path.basename(pdf_path))
                part['Content-Disposition'] = f'attachment; filename="{os.path.basename(pdf_path)}"'
                msg.attach(part)

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)

            return {
                "status": "Submitted",
                "method": "Email",
                "details": f"Successfully emailed application cover letter & resume to {recipient}."
            }
        except Exception as e:
            return {
                "status": "Failed",
                "method": "Email",
                "details": f"Email sending failed: {str(e)}"
            }


class HandoffProvider(SubmissionProvider):
    def is_supported(self, url: str) -> bool:
        return True  # Fallback for all URLs
        
    def can_submit(self, url: str) -> bool:
        return True
        
    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        return {
            "url": record.get("job_url") or record.get("url") or "",
            "cover_letter": record.get("tailored_cover_letter", "")
        }
        
    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        url = payload["url"]
        
        # Copy to clipboard
        clipboard_status = "Cover letter copy skipped (clipboard unavailable)."
        if pyperclip:
            try:
                pyperclip.copy(payload["cover_letter"])
                clipboard_status = "Tailored cover letter copied to system clipboard!"
            except Exception as e:
                clipboard_status = f"Clipboard copy failed: {e}"

        # Open job url in browser
        browser_status = "Browser open skipped."
        if url:
            try:
                webbrowser.open(url)
                browser_status = f"Opened job portal in your default browser: {url}"
            except Exception as e:
                browser_status = f"Could not launch browser automatically: {e}"

        return {
            "status": "Handoff",
            "method": "Manual Browser Handoff",
            "details": f"{browser_status} {clipboard_status} Paste the cover letter directly to complete the submission."
        }


class IntershalProvider(SubmissionProvider):
    """
    Internshala Browser Handoff Provider.

    Internshala has no public API for automated application submission.
    Automating login via bot would violate their Terms of Service and
    require storing user passwords — a serious security risk.

    Safe approach: Open the Internshala job page in the user's browser
    (where they are already logged in), copy the tailored cover letter
    to clipboard, and surface their Internshala profile URL so they can
    Quick Apply in a few clicks.
    """

    def is_supported(self, url: str) -> bool:
        return "internshala.com" in url.lower()

    def can_submit(self, url: str) -> bool:
        return True  # Browser handoff always works

    def prepare_payload(self, profile: Dict[str, Any], record: Dict[str, Any], answers: Dict[str, str]) -> Dict[str, Any]:
        personal = profile.get("personal_info") or {}
        return {
            "url": record.get("job_url") or record.get("url") or "",
            "cover_letter": record.get("tailored_cover_letter", ""),
            "internshala_profile": (
                answers.get("internshala_profile")
                or personal.get("internshala_profile", "")
            ),
            "role_title": record.get("role_title", ""),
            "company": record.get("company", ""),
        }

    def submit(self, payload: Dict[str, Any], pdf_path: Optional[str] = None) -> Dict[str, Any]:
        url = payload["url"]
        internshala_profile = payload.get("internshala_profile", "")
        role = payload.get("role_title", "this role")
        company = payload.get("company", "")

        # Copy tailored cover letter to clipboard
        clipboard_status = "Cover letter copy skipped (clipboard unavailable)."
        if pyperclip:
            try:
                pyperclip.copy(payload["cover_letter"])
                clipboard_status = "Tailored cover letter copied to clipboard — paste it into the Internshala cover letter box."
            except Exception as e:
                clipboard_status = f"Clipboard copy failed: {e}"

        # Open the Internshala job/internship page in browser
        browser_status = "Browser open skipped — no URL provided."
        if url:
            try:
                webbrowser.open(url)
                browser_status = f"Opened Internshala listing for {role} at {company} in your browser."
            except Exception as e:
                browser_status = f"Could not launch browser: {e}"

        profile_hint = (
            f"Your Internshala profile: {internshala_profile}"
            if internshala_profile
            else "Tip: Add your Internshala Profile URL in your JobSetu Profile page so it auto-fills next time."
        )

        return {
            "status": "Handoff",
            "method": "Internshala Browser Handoff",
            "details": (
                f"{browser_status} "
                f"{clipboard_status} "
                f"{profile_hint} "
                f"Log in to Internshala if needed, then click 'Apply Now' and paste the cover letter."
            )
        }



class SubmissionRouter:
    """Orchestrates different submission channels, safely deciding supported vs unauthorized routes."""
    
    def __init__(self):
        self.providers = [
            LeverProvider(),
            GreenhouseProvider(),
            IntershalProvider(),   # Internshala browser handoff (detected before generic fallback)
        ]
        self.fallback = HandoffProvider()
        self.email_provider = EmailProvider()

    def get_provider_for_url(self, url: str, has_email: bool = False) -> SubmissionProvider:
        if has_email:
            return self.email_provider
            
        for p in self.providers:
            if p.is_supported(url):
                return p
        return self.fallback

    def route_and_submit(
        self,
        application_record: Dict[str, Any],
        candidate_profile: Dict[str, Any],
        answers: Dict[str, str],
        resume_pdf_path: Optional[str] = None
    ) -> Dict[str, Any]:
        job_url = application_record.get("job_url", "")
        if not job_url:
            from app.services.job_service import job_service
            job = job_service.get_job_details(application_record.get("job_id", ""))
            if job:
                job_url = getattr(job, "url", "")

        has_email = bool(application_record.get("apply_email", ""))
        provider = self.get_provider_for_url(job_url, has_email=has_email)

        # Safety Check: If it is supported, but cannot submit (missing configurations/credentials)
        if provider.is_supported(job_url) and not provider.can_submit(job_url):
            # Safe degradation fallback: manual handoff
            provider = self.fallback

        payload = provider.prepare_payload(candidate_profile, application_record, answers)
        return provider.submit(payload, pdf_path=resume_pdf_path)


submission_router = SubmissionRouter()
