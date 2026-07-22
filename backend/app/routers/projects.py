import uuid
import secrets
import hashlib
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.schemas import ProjectCreate, ProjectResponse, APIKeyCreateResponse, APIKeyInfo
from app.database import get_supabase, db_mem, hash_api_key

router = APIRouter(prefix="/api/v1/projects", tags=["Projects & API Keys"])

from app.auth import get_current_user

@router.post("", response_model=Dict[str, Any])
def create_project(
    payload: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Creates a new project and initial API key for the authenticated user."""
    sp = get_supabase()
    account_id = current_user["id"]
    project_id = str(uuid.uuid4())
    raw_key = f"ch_live_{secrets.token_hex(16)}"
    key_hash = hash_api_key(raw_key)
    prefix = raw_key[:12]
    now_str = datetime.now(timezone.utc).isoformat()

    if sp:
        try:
            # Ensure user account exists in public schema (should be done by trigger, fallback here)
            sp.table("accounts").insert({
                "id": account_id,
                "email": current_user["email"],
                "plan": "free"
            }).on_conflict("id").ignore().execute()

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
    if account_id not in db_mem.accounts:
        db_mem.accounts[account_id] = {
            "id": account_id,
            "email": current_user["email"],
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

    db_mem.api_keys[key_hash] = {
        "id": str(uuid.uuid4()),
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
def list_projects(current_user: Dict[str, Any] = Depends(get_current_user)):
    """Lists projects owned by user or shared via team membership."""
    sp = get_supabase()
    user_id = current_user["id"]
    if sp:
        try:
            # 1. Teams the user belongs to
            teams_res = sp.table("team_members").select("team_id").eq("user_id", user_id).execute()
            team_ids = [t["team_id"] for t in teams_res.data] if teams_res.data else []

            # 2. Get projects owned by user OR linked to user's teams
            # Supabase doesn't support complex OR filters across related tables in a single filter easily
            # so we fetch both and merge them or use a SQL query.
            # Fetch owned projects:
            owned_res = sp.table("projects").select("*").eq("account_id", user_id).execute()
            projects_list = owned_res.data or []

            # Fetch team projects if any teams:
            if team_ids:
                team_res = sp.table("projects").select("*").in_("team_id", team_ids).execute()
                if team_res.data:
                    owned_ids = {p["id"] for p in projects_list}
                    for p in team_res.data:
                        if p["id"] not in owned_ids:
                            projects_list.append(p)

            return projects_list
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory search
    owned = [p for p in db_mem.projects.values() if p["account_id"] == user_id]
    
    # Team shared
    teams = [m["team_id"] for m in db_mem.team_members.values() if m["user_id"] == user_id]
    shared = [p for p in db_mem.projects.values() if p.get("team_id") in teams]
    
    merged = {p["id"]: p for p in owned + shared}
    return list(merged.values())
