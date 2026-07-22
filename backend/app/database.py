import logging
import hashlib
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.config import settings

logger = logging.getLogger(__name__)

_supabase_client = None

def get_supabase():
    global _supabase_client
    if _supabase_client is None:
        try:
            from supabase import create_client, Client
            if settings.SUPABASE_URL and settings.SUPABASE_KEY and "localhost" not in settings.SUPABASE_URL:
                _supabase_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
                logger.info("Connected to Supabase client.")
            else:
                logger.info("Supabase URL is local/default. Using In-Memory Store.")
                _supabase_client = False
        except Exception as e:
            logger.warning(f"Could not connect to Supabase: {e}. Defaulting to in-memory store.")
            _supabase_client = False
    return _supabase_client if _supabase_client else None

# In-Memory database store fallback for dev/testing when Supabase is offline
class InMemoryDB:
    def __init__(self):
        self.accounts: Dict[str, Dict[str, Any]] = {}
        self.projects: Dict[str, Dict[str, Any]] = {}
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.documents: Dict[str, Dict[str, Any]] = {}
        self.decisions: Dict[str, Dict[str, Any]] = {}
        self.features: Dict[str, Dict[str, Any]] = {}
        self.feature_edges: Dict[str, Dict[str, Any]] = {}
        self.tasks: Dict[str, Dict[str, Any]] = {}
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.agent_notes: Dict[str, Dict[str, Any]] = {}
        # Teams & Collaboration
        self.teams: Dict[str, Dict[str, Any]] = {}
        self.team_members: Dict[str, Dict[str, Any]] = {}
        self.invitations: Dict[str, Dict[str, Any]] = {}

        # Default demo setup
        self._init_demo()

    def _init_demo(self):
        demo_account_id = "00000000-0000-0000-0000-000000000001"
        demo_project_id = "00000000-0000-0000-0000-000000000002"
        demo_key_raw = "ch_live_demo1234567890abcdef"
        demo_key_hash = hashlib.sha256(demo_key_raw.encode()).hexdigest()

        self.accounts[demo_account_id] = {
            "id": demo_account_id,
            "email": "demo@contexthub.dev",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "plan": "free"
        }
        self.projects[demo_project_id] = {
            "id": demo_project_id,
            "account_id": demo_account_id,
            "name": "Demo ContextHub Project",
            "description": "Default initial project for local testing",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        self.api_keys[demo_key_hash] = {
            "id": "00000000-0000-0000-0000-000000000003",
            "account_id": demo_account_id,
            "project_id": demo_project_id,
            "key_hash": demo_key_hash,
            "prefix": "ch_live_demo",
            "name": "Demo API Key",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_used_at": None
        }

db_mem = InMemoryDB()

def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()

def validate_api_key_db(api_key: str) -> Optional[Dict[str, Any]]:
    khash = hash_api_key(api_key)
    sp = get_supabase()
    if sp:
        try:
            res = sp.table("api_keys").select("*").eq("key_hash", khash).execute()
            if res.data and len(res.data) > 0:
                key_info = res.data[0]
                # Update last used timestamp async-style
                sp.table("api_keys").update({"last_used_at": datetime.now(timezone.utc).isoformat()}).eq("id", key_info["id"]).execute()
                return key_info
        except Exception as e:
            logger.error(f"Error validating API key against Supabase: {e}")

    # Fallback to memory
    if khash in db_mem.api_keys:
        info = db_mem.api_keys[khash]
        info["last_used_at"] = datetime.now(timezone.utc).isoformat()
        return info

    return None
