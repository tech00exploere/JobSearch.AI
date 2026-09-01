import re
from typing import Optional

def validate_url(url: Optional[str]) -> Optional[str]:
    """
    Validates and sanitizes a URL.
    Returns the cleaned URL string if valid, or None if invalid or a fallback search URL.
    STRICT RULES:
    1. Must be a valid HTTP or HTTPS URL.
    2. Rejects Google search URLs (google.com/search, search?q=).
    3. Rejects fabricated/guessed URLs (fake-url, example.com/fake, guessed string placeholders).
    4. Rejects javascript: and data: schemes.
    5. Rejects malformed or empty URLs.
    6. Never invents or returns a replacement fallback search URL.
    """
    if not url or not isinstance(url, str):
        return None

    cleaned = url.strip()
    if not cleaned:
        return None

    lower = cleaned.lower()

    # Reject non-http/https schemes (javascript:, data:, etc.)
    if lower.startswith("javascript:") or lower.startswith("data:") or lower.startswith("file:"):
        return None

    # Reject Google search URLs or general search query fallbacks
    if "google.com/search" in lower or "search?q=" in lower:
        return None

    # Reject fake/guessed string placeholders
    if "fake-url" in lower or "example.com/fake" in lower or "placeholder" in lower or "fake_url" in lower:
        return None

    # Ensure valid http:// or https:// schema
    if re.match(r"^https?://[^\s/$.?#].[^\s]*$", cleaned, re.IGNORECASE):
        return cleaned

    return None
