import io
import os
from typing import Dict, Any

import httpx
from pypdf import PdfReader


AFFINDA_API_KEY = os.getenv("AFFINDA_API_KEY", "aff_219f17111d2c27ec588cc71235b528416fbad26a")
AFFINDA_COLLECTION = os.getenv("AFFINDA_COLLECTION", "uTcxQJVO")
AFFINDA_BASE_URL = "https://api.affinda.com/v3"


class ResumeParserService:
    """Parses resumes using the Affinda Resume Parser API (v3)."""

    def __init__(self):
        self.headers = {"Authorization": f"Bearer {AFFINDA_API_KEY}"}

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """Extracts plain text from PDF bytes using pypdf."""
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            raise ValueError(f"Failed to extract text from PDF: {str(e)}")

    def parse_resume_bytes(self, file_bytes: bytes, filename: str = "resume.pdf") -> Dict[str, Any]:
        """
        Upload raw file bytes to Affinda and return a master_resume-compatible dict.
        Accepts both PDF and TXT files.
        """
        affinda_data = self._upload_to_affinda(file_bytes, filename)
        return self._map_to_master_resume(affinda_data)

    def parse_resume_text(self, text: str) -> Dict[str, Any]:
        """Upload plain text as a .txt file to Affinda and map to master_resume schema."""
        file_bytes = text.encode("utf-8")
        return self.parse_resume_bytes(file_bytes, filename="resume.txt")

    # ------------------------------------------------------------------
    # Internal methods
    # ------------------------------------------------------------------

    def _upload_to_affinda(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """POST file to Affinda /v3/documents and return the parsed data dict."""
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{AFFINDA_BASE_URL}/documents",
                    headers=self.headers,
                    data={"collection": AFFINDA_COLLECTION},
                    files={"file": (filename, file_bytes)},
                )
            response.raise_for_status()
            result = response.json()
            if result.get("error", {}).get("errorCode"):
                raise ValueError(f"Affinda error: {result['error']['errorDetail']}")
            return result.get("data", {})
        except httpx.HTTPStatusError as e:
            raise ValueError(f"Affinda API HTTP error {e.response.status_code}: {e.response.text}")
        except Exception as e:
            raise ValueError(f"Failed to parse resume with Affinda: {str(e)}")

    def _safe_str(self, val) -> str:
        if val is None:
            return ""
        if isinstance(val, dict):
            return val.get("raw", "") or val.get("normalized", "") or str(val)
        return str(val)

    def _map_to_master_resume(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Map Affinda's parsed data into our master_resume JSON schema."""

        # --- Personal Info ---
        name_obj = data.get("name") or {}
        first = self._safe_str(name_obj.get("first", ""))
        last = self._safe_str(name_obj.get("last", ""))
        full_name = f"{first} {last}".strip()

        emails = data.get("emails") or []
        email = emails[0] if emails else ""

        phones = data.get("phoneNumbers") or []
        phone = phones[0] if phones else ""

        location_obj = data.get("location") or {}
        location = self._safe_str(location_obj.get("formatted", "")) if location_obj else ""

        linkedin = self._safe_str(data.get("linkedin") or "")

        websites = data.get("websites") or []
        github = next((w for w in websites if "github" in str(w).lower()), "")
        if not github and websites:
            github = str(websites[0])

        profession = self._safe_str(data.get("profession") or "")

        # --- Summary ---
        summary = self._safe_str(data.get("summary") or data.get("objective") or "")

        # --- Skills ---
        raw_skills = data.get("skills") or []
        skill_names = [s.get("name", "") for s in raw_skills if s.get("name")]

        lang_keywords = {"python", "javascript", "typescript", "java", "c++", "go", "rust", "ruby", "kotlin", "swift", "php", "scala", "r", "dart", "bash"}
        frontend_keywords = {"react", "next.js", "vue", "angular", "html", "css", "tailwind", "sass", "redux", "svelte", "bootstrap"}
        backend_keywords = {"node.js", "fastapi", "flask", "django", "express", "spring", "laravel", "graphql", "nestjs"}
        ai_keywords = {"pytorch", "tensorflow", "scikit-learn", "numpy", "pandas", "langchain", "openai", "rag", "huggingface", "transformers", "keras"}
        db_keywords = {"mongodb", "postgresql", "mysql", "sqlite", "redis", "cassandra", "firebase", "dynamodb", "supabase", "pinecone"}
        devops_keywords = {"docker", "kubernetes", "git", "github", "gitlab", "aws", "azure", "gcp", "ci/cd", "jenkins", "linux", "terraform", "nginx"}

        skills_map: Dict[str, list] = {"languages": [], "frontend": [], "backend": [], "ai_ml": [], "databases": [], "devops_tools": []}
        for s in skill_names:
            sl = s.lower()
            if any(k in sl for k in lang_keywords):
                skills_map["languages"].append(s)
            elif any(k in sl for k in frontend_keywords):
                skills_map["frontend"].append(s)
            elif any(k in sl for k in backend_keywords):
                skills_map["backend"].append(s)
            elif any(k in sl for k in ai_keywords):
                skills_map["ai_ml"].append(s)
            elif any(k in sl for k in db_keywords):
                skills_map["databases"].append(s)
            else:
                skills_map["devops_tools"].append(s)

        # --- Work Experience ---
        experience = []
        for i, exp in enumerate(data.get("workExperience") or []):
            highlights = []
            desc = self._safe_str(exp.get("jobDescription") or "")
            if desc:
                highlights = [line.strip("- *\t").strip() for line in desc.split("\n") if line.strip()]
            date_obj = exp.get("dates") or {}
            start = self._safe_str(date_obj.get("startDate") or date_obj.get("rawText") or "")
            end = self._safe_str(date_obj.get("endDate") or "Present")
            period = f"{start} - {end}".strip(" -")
            experience.append({
                "id": f"exp-{i+1}",
                "company": self._safe_str(exp.get("organization") or ""),
                "role": self._safe_str(exp.get("jobTitle") or ""),
                "location": self._safe_str((exp.get("location") or {}).get("formatted") or ""),
                "period": period,
                "highlights": highlights[:6],
            })

        # --- Education ---
        education = []
        for edu in data.get("education") or []:
            acc = edu.get("accreditation") or {}
            degree = self._safe_str(acc.get("education") or acc.get("inputStr") or "")
            date_obj = edu.get("dates") or {}
            start = self._safe_str(date_obj.get("startDate") or "")
            end = self._safe_str(date_obj.get("completionDate") or date_obj.get("rawText") or "")
            year = f"{start} - {end}".strip(" -")
            education.append({
                "degree": degree,
                "institution": self._safe_str(edu.get("organization") or ""),
                "year": year,
                "details": self._safe_str(edu.get("grade") or ""),
            })

        return {
            "personal_info": {
                "name": full_name,
                "title": profession,
                "email": email,
                "phone": phone,
                "location": location,
                "github": github,
                "linkedin": linkedin,
            },
            "summary": summary,
            "skills": skills_map,
            "projects": [],  # Affinda Resume extractor doesn't extract projects; user fills manually
            "experience": experience,
            "education": education,
        }


resume_parser_service = ResumeParserService()


