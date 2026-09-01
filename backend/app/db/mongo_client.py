import os
from pymongo import MongoClient
from typing import Optional

# Load MongoDB URI from environment or fallback to localhost
MONGO_URI = os.getenv(
    "MONGODB_URI",
    "mongodb://localhost:27017/jobsetu"
)

# Singleton client holder
_client: Optional[MongoClient] = None

def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Verify connection (ping) – ignore errors, will be handled by caller
        try:
            _client.admin.command('ping')
        except Exception:
            pass
    return _client

def get_database(db_name: str = "jobsetu"):
    client = get_client()
    return client[db_name]
