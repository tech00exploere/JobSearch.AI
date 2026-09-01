from typing import Dict, Type, List
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.connectors.linkedin import LinkedInConnector
from app.job_discovery.connectors.indeed import IndeedConnector
from app.job_discovery.connectors.unstop import UnstopConnector
from app.job_discovery.connectors.internshala import InternshalaConnector
from app.job_discovery.connectors.monster import MonsterConnector
from app.job_discovery.connectors.wellfound import WellfoundConnector
from app.job_discovery.connectors.glassdoor import GlassdoorConnector
from app.job_discovery.connectors.naukri import NaukriConnector
from app.job_discovery.connectors.foundit import FounditConnector
from app.job_discovery.connectors.dice import DiceConnector
from app.job_discovery.connectors.greenhouse import GreenhouseConnector
from app.job_discovery.connectors.lever import LeverConnector
from app.job_discovery.connectors.ashby import AshbyConnector
from app.job_discovery.connectors.workday import WorkdayConnector
from app.job_discovery.connectors.smartrecruiters import SmartRecruitersConnector
from app.job_discovery.connectors.generic import GenericConnector
from app.job_discovery.connectors.web_search import WebSearchConnector

CONNECTOR_REGISTRY: Dict[str, Type[JobSourceConnector]] = {
    "linkedin": LinkedInConnector,
    "indeed": IndeedConnector,
    "unstop": UnstopConnector,
    "internshala": InternshalaConnector,
    "monster": MonsterConnector,
    "wellfound": WellfoundConnector,
    "glassdoor": GlassdoorConnector,
    "naukri": NaukriConnector,
    "foundit": FounditConnector,
    "dice": DiceConnector,
    "greenhouse": GreenhouseConnector,
    "lever": LeverConnector,
    "ashby": AshbyConnector,
    "workday": WorkdayConnector,
    "smartrecruiters": SmartRecruitersConnector,
    "generic": GenericConnector,
    "web_search": WebSearchConnector,
}

def get_all_active_connectors() -> List[JobSourceConnector]:
    """Instantiates active connectors for full web-wide discovery."""
    connectors = []
    seen = set()
    for name, cls in CONNECTOR_REGISTRY.items():
        if cls not in seen:
            seen.add(cls)
            connectors.append(cls())
    return connectors

def get_connector_class(connector_type: str) -> Type[JobSourceConnector]:
    """Returns the connector class for a given connector name."""
    return CONNECTOR_REGISTRY.get(connector_type.lower(), GenericConnector)

def create_connector(entry: dict) -> JobSourceConnector:
    """Instantiates a connector for a given config dictionary."""
    conn_type = entry.get("connector") or entry.get("source_type") or "generic"
    cls = get_connector_class(conn_type)
    return cls(entry)
