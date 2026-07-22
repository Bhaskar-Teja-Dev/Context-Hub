import uuid
import secrets
import hashlib
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.schemas import ProjectCreate, ProjectResponse, APIKeyCreateResponse, APIKeyInfo
from app.database import get_supabase, db_mem, hash_api_key

router = APIRouter(prefix="/api/v1/projects", tags=["Projects & API Keys"])

@router.post("", response_model=Dict[str, Any])
def create_project(payload: ProjectCreate):
    """Creates a new account (if missing), project, and initial API key."""
    sp = get_supabase()
    account_id = None
    project_id = str(uuid.uuid4())
    raw_key = f"ch_live_{secrets.token_hex(16)}"
    key_hash = hash_api_key(raw_key)
    prefix = raw_key[:12]
    now_str = datetime.now(timezone.utc).isoformat()

    if sp:
        try:
            # Check or create account
            acc_res = sp.table("accounts").select("*").eq("email", payload.email).execute()
            if acc_res.data and len(acc_res.data) > 0:
                account_id = acc_res.data[0]["id"]
            else:
                account_id = str(uuid.uuid4())
                sp.table("accounts").insert({
                    "id": account_id,
                    "email": payload.email,
                    "plan": "free"
                }).execute()

            # Create project
            proj_res = sp.table("projects").insert({
                "id": project_id,
                "account_id": account_id,
                "name": payload.name,
                "description": payload.description
            }).execute()

            # Create initial API Key
            key_id = str(uuid.uuid4())
            sp.table("api_keys").insert({
                "id": key_id,
                "account_id": account_id,
                "project_id": project_id,
                "key_hash": key_hash,
                "prefix": prefix,
                "name": "Initial Key"
            }).execute()

            return {
                "project": proj_res.data[0] if proj_res.data else {
                    "id": project_id, "account_id": account_id, "name": payload.name, "created_at": now_str
                },
                "api_key": raw_key,
                "prefix": prefix,
                "instructions": "Store this API Key securely. It will not be shown again."
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory fallback
    account_id = str(uuid.uuid4())
    for acc in db_mem.accounts.values():
        if acc["email"] == payload.email:
            account_id = acc["id"]
            break

    if account_id not in db_mem.accounts:
        db_mem.accounts[account_id] = {
            "id": account_id,
            "email": payload.email,
            "created_at": now_str,
            "plan": "free"
        }

    db_mem.projects[project_id] = {
        "id": project_id,
        "account_id": account_id,
        "name": payload.name,
        "description": payload.description,
        "created_at": now_str
    }

    key_id = str(uuid.uuid4())
    db_mem.api_keys[key_hash] = {
        "id": key_id,
        "account_id": account_id,
        "project_id": project_id,
        "key_hash": key_hash,
        "prefix": prefix,
        "name": "Initial Key",
        "created_at": now_str,
        "last_used_at": None
    }

    return {
        "project": db_mem.projects[project_id],
        "api_key": raw_key,
        "prefix": prefix,
        "instructions": "Store this API Key securely. It will not be shown again."
    }

@router.get("", response_model=List[Dict[str, Any]])
def list_projects(email: str):
    """Lists projects associated with an account email."""
    sp = get_supabase()
    if sp:
        try:
            acc_res = sp.table("accounts").select("id").eq("email", email).execute()
            if not acc_res.data:
                return []
            acc_id = acc_res.data[0]["id"]
            proj_res = sp.table("projects").select("*").eq("account_id", acc_id).execute()
            return proj_res.data
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory search
    acc_id = None
    for acc in db_mem.accounts.values():
        if acc["email"] == email:
            acc_id = acc["id"]
            break
    if not acc_id:
        return []
    return [p for p in db_mem.projects.values() if p["account_id"] == acc_id]
