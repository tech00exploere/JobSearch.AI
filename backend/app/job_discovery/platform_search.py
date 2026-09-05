"""
Platform Search Shortcut Generator
====================================
Generates real platform job-search URLs based on user criteria.

These are NOT individual job listings.
These are direct links to the platform's own search results page,
pre-populated with the user's query (role, location, experience, etc.).

Rules:
- Never fabricate individual job URLs.
- Never claim JobSearch.ai retrieved full platform inventory.
- Never call any platform API.
- Clicking Browse opens the platform's REAL search results in a new tab.
- Opening the link does NOT change any application status.
"""

from urllib.parse import urlencode


PLATFORM_CONFIGS = [
    {
        "platform": "linkedin",
        "display_name": "LinkedIn",
        "icon": "💼",
        "base_url": "https://www.linkedin.com/jobs/search/",
        "params": lambda role, location, remote, experience: {
            "keywords": role,
            "location": location,
            **({"f_WT": "2"} if remote else {}),  # 2 = Remote
        },
    },
    {
        "platform": "indeed",
        "display_name": "Indeed",
        "icon": "🔎",
        "base_url": "https://in.indeed.com/jobs",
        "params": lambda role, location, remote, experience: {
            "q": role,
            "l": location,
            **({"remotejob": "032b3046-06a3-4876-8dfd-474eb5e7ed11"} if remote else {}),
        },
    },
    {
        "platform": "naukri",
        "display_name": "Naukri",
        "icon": "🧑‍💻",
        "base_url": "https://www.naukri.com/jobs-in-india",
        "params": lambda role, location, remote, experience: {
            "k": role,
            "l": location,
        },
    },
    {
        "platform": "internshala",
        "display_name": "Internshala",
        "icon": "🎓",
        "base_url": "https://internshala.com/jobs/",
        "params": lambda role, location, remote, experience: {
            "keywords": role,
        },
    },
    {
        "platform": "unstop",
        "display_name": "Unstop",
        "icon": "🏆",
        "base_url": "https://unstop.com/jobs",
        "params": lambda role, location, remote, experience: {
            "search": role,
            "location": location,
        },
    },
    {
        "platform": "foundit",
        "display_name": "Foundit",
        "icon": "🔍",
        "base_url": "https://www.foundit.in/search/jobs",
        "params": lambda role, location, remote, experience: {
            "searchType": "personalizedSearch",
            "keyword": role,
            "location": location,
        },
    },
    {
        "platform": "monster",
        "display_name": "Monster",
        "icon": "👾",
        "base_url": "https://www.monsterindia.com/srp/results",
        "params": lambda role, location, remote, experience: {
            "query": role,
            "locations": location,
        },
    },
    {
        "platform": "wellfound",
        "display_name": "Wellfound",
        "icon": "🚀",
        "base_url": "https://wellfound.com/jobs",
        "params": lambda role, location, remote, experience: {
            "role": role,
            "location": location,
        },
    },
    {
        "platform": "glassdoor",
        "display_name": "Glassdoor",
        "icon": "🪟",
        "base_url": "https://www.glassdoor.co.in/Job/jobs.htm",
        "params": lambda role, location, remote, experience: {
            "sc.keyword": role,
        },
    },
    {
        "platform": "dice",
        "display_name": "Dice",
        "icon": "🎲",
        "base_url": "https://www.dice.com/jobs",
        "params": lambda role, location, remote, experience: {
            "q": role,
            "location": location,
        },
    },
]


def build_platform_search_url(config: dict, role: str, location: str, remote: bool, experience: str) -> str:
    """Constructs a real platform search URL from user criteria."""
    params = config["params"](role, location, remote, experience)
    # Remove empty values
    params = {k: v for k, v in params.items() if v}
    return f"{config['base_url']}?{urlencode(params)}"


def generate_platform_links(
    role: str,
    location: str = "India",
    remote: bool = False,
    experience: str = "",
    internship: bool = False,
) -> list[dict]:
    """
    Returns a list of platform search shortcuts for the given criteria.
    Each entry is a dict with:
      - platform, display_name, icon, search_url, label
    None of these are individual job listings.
    """
    links = []
    for config in PLATFORM_CONFIGS:
        # Internshala is primarily for internships — always include it
        url = build_platform_search_url(config, role, location, remote, experience)
        links.append({
            "platform": config["platform"],
            "display_name": config["display_name"],
            "icon": config["icon"],
            "search_url": url,
            "label": f"Browse {config['display_name']} Jobs",
            "search_query": role,
            "location": location,
        })
    return links
