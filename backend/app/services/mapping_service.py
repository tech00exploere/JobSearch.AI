from typing import Dict, Any, List
from app.models.schemas import FormQuestion, FormMappingResponse


class MappingService:
    """Auto-fills application form fields using the candidate's profile data."""

    def get_questions_for_channel(self, submission_channel: str, candidate_profile: Dict[str, Any]) -> List[FormQuestion]:
        """
        Determines the list of questions required for the submission channel 
        and auto-fills them with candidate data where available.
        """
        personal = candidate_profile.get("personal_info") or {}
        name = personal.get("name", "")
        email = personal.get("email", "")
        phone = personal.get("phone", "")
        linkedin = personal.get("linkedin", "")
        github = personal.get("github", "")

        # Base questions asked in almost every application form
        questions = [
            FormQuestion(
                field_key="full_name",
                question_text="Full Name",
                value=name,
                status="auto_filled" if name else "needs_input"
            ),
            FormQuestion(
                field_key="email",
                question_text="Email Address",
                value=email,
                status="auto_filled" if email else "needs_input"
            ),
            FormQuestion(
                field_key="phone",
                question_text="Phone Number",
                value=phone,
                status="auto_filled" if phone else "needs_input"
            ),
            FormQuestion(
                field_key="linkedin",
                question_text="LinkedIn URL",
                value=linkedin,
                status="auto_filled" if linkedin else "needs_input"
            ),
            FormQuestion(
                field_key="github",
                question_text="GitHub URL",
                value=github,
                status="auto_filled" if github else "needs_input"
            ),
        ]

        # Channel-specific additional questions
        if submission_channel in ["Lever API", "Greenhouse API", "Lever API (Mocked)", "Greenhouse API (Mocked)"]:
            questions.extend([
                FormQuestion(
                    field_key="authorized_to_work",
                    question_text="Are you legally authorized to work in the country where this job is located?",
                    value="",
                    status="needs_input",
                    options=["Yes", "No"]
                ),
                FormQuestion(
                    field_key="sponsorship_required",
                    question_text="Will you now or in the future require visa sponsorship to work?",
                    value="",
                    status="needs_input",
                    options=["Yes", "No"]
                ),
                FormQuestion(
                    field_key="years_of_experience",
                    question_text="How many years of relevant experience do you have?",
                    value="1",  # Pre-filled baseline default based on internship experience
                    status="auto_filled"
                ),
                FormQuestion(
                    field_key="portfolio",
                    question_text="Portfolio Website / Link",
                    value="",
                    status="needs_input"
                )
            ])
        elif submission_channel == "Internshala Browser Handoff":
            internshala_profile = personal.get("internshala_profile", "")
            questions.extend([
                FormQuestion(
                    field_key="internshala_profile",
                    question_text="Internshala Profile URL",
                    value=internshala_profile,
                    status="auto_filled" if internshala_profile else "needs_input"
                ),
                FormQuestion(
                    field_key="availability",
                    question_text="Availability to Start (e.g. Immediate, 2 weeks notice)",
                    value="Immediate",
                    status="auto_filled"
                ),
                FormQuestion(
                    field_key="cover_letter_note",
                    question_text="Cover Letter Note (will be copied to clipboard for you to paste)",
                    value="AI-tailored cover letter will be auto-copied to your clipboard on submission.",
                    status="auto_filled"
                ),
            ])
        elif submission_channel in ["Manual Browser Handoff", "Email", "Email (Mocked)"]:
            questions.append(
                FormQuestion(
                    field_key="portfolio",
                    question_text="Portfolio / Website URL",
                    value="",
                    status="needs_input"
                )
            )

        return questions


mapping_service = MappingService()

