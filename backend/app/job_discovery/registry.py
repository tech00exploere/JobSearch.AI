from typing import Dict, Type
from app.job_discovery.base import JobSourceConnector
from app.job_discovery.connectors.greenhouse import GreenhouseConnector
from app.job_discovery.connectors.lever import LeverConnector
from app.job_discovery.connectors.ashby import AshbyConnector
from app.job_discovery.connectors.workday import WorkdayConnector
from app.job_discovery.connectors.smartrecruiters import SmartRecruitersConnector
from app.job_discovery.connectors.generic import GenericConnector
from app.job_discovery.connectors.web_search import WebSearchConnector

CONNECTOR_REGISTRY: Dict[str, Type[JobSourceConnector]] = {
    "greenhouse": GreenhouseConnector,
    "lever": LeverConnector,
    "ashby": AshbyConnector,
    "workday": WorkdayConnector,
    "smartrecruiters": SmartRecruitersConnector,
    "generic": GenericConnector,
    "web_search": WebSearchConnector,
}

def get_connector_class(connector_type: str) -> Type[JobSourceConnector]:
    """Returns the connector class for a given connector name."""
    return CONNECTOR_REGISTRY.get(connector_type.lower(), GenericConnector)

def create_connector(entry: dict) -> JobSourceConnector:
    """Instantiates a connector for a given config dictionary."""
    conn_type = entry.get("connector") or entry.get("source_type") or "generic"
    cls = get_connector_class(conn_type)
    return cls(entry)
