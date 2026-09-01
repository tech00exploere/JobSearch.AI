from typing import List, Optional
from datetime import datetime
from app.schemas.discovered_job import NormalizedJob

def sort_by_freshness(jobs: List[NormalizedJob]) -> List[NormalizedJob]:
    """
    Sorts NormalizedJob records by freshness (posted_at newest first).
    Jobs with missing posted_at retain posted_at = None (never invented)
    and are ordered by discovered_at as a secondary tie-breaker.
    """
    def sort_key(job: NormalizedJob):
        has_posted = job.posted_at is not None
        p_time = job.posted_at.timestamp() if job.posted_at else 0.0
        d_time = job.discovered_at.timestamp() if job.discovered_at else 0.0
        return (1 if has_posted else 0, p_time, d_time)

    return sorted(jobs, key=sort_key, reverse=True)

def format_freshness_label(posted_at: Optional[datetime], discovered_at: Optional[datetime] = None) -> str:
    """Returns a user-friendly relative timestamp string."""
    target = posted_at or discovered_at
    if not target:
        return "Recently discovered"

    now = datetime.now()
    diff_seconds = max(0, int((now - target).total_seconds()))

    if diff_seconds < 60:
        return "Posted just now"
    elif diff_seconds < 3600:
        mins = diff_seconds // 60
        return f"Posted {mins} minute{'s' if mins > 1 else ''} ago"
    elif diff_seconds < 86400:
        hrs = diff_seconds // 3600
        return f"Posted {hrs} hour{'s' if hrs > 1 else ''} ago"
    elif diff_seconds < 604800:
        days = diff_seconds // 86400
        return f"Posted {days} day{'s' if days > 1 else ''} ago"
    else:
        return target.strftime("Posted %b %d, %Y")
