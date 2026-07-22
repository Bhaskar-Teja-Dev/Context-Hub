from fastapi import Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from app.database import validate_api_key_db, get_supabase

api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_project(
    x_api_key: Optional[str] = Security(api_key_header_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme),
    x_project_id: Optional[str] = Header(None)
) -> Dict[str, Any]:
    token = x_api_key
    if not token and bearer_auth:
        token = bearer_auth.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials."
        )

    # 1. API Key Authentication (starts with ch_live_ or mock_key_)
    if token.startswith("ch_live_") or token.startswith("mock_key_"):
        project_info = validate_api_key_db(token)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API Key."
            )
        return project_info

    # 2. User JWT Session Authentication
    sp = get_supabase()
    user_id = None
    email = None

    if sp:
        try:
            user_res = sp.auth.get_user(token)
            if user_res and user_res.user:
                user_id = user_res.user.id
                email = user_res.user.email
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid user session: {str(e)}"
            )
    elif token.startswith("mock_user_"):
        parts = token.split("_")
        user_id = parts[2] if len(parts) > 2 else "00000000-0000-0000-0000-000000000001"
        email = f"{parts[2]}@contexthub.dev" if len(parts) > 2 else "demo@contexthub.dev"

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )

    if not x_project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Header 'X-Project-Id' is required for user-based dashboard sessions."
        )

    # Check project access permissions for the user (owner or team member)
    has_access = False
    from app.database import db_mem
    if sp:
        proj_res = sp.table("projects").select("*").eq("id", x_project_id).execute()
        if proj_res.data:
            proj = proj_res.data[0]
            if proj["account_id"] == user_id:
                has_access = True
            elif proj.get("team_id"):
                mem_check = sp.table("team_members").select("id").eq("team_id", proj["team_id"]).eq("user_id", user_id).execute()
                if mem_check.data:
                    has_access = True
    else:
        proj = db_mem.projects.get(x_project_id)
        if proj:
            if proj["account_id"] == user_id:
                has_access = True
            elif proj.get("team_id"):
                for m in db_mem.team_members.values():
                    if m["team_id"] == proj["team_id"] and m["user_id"] == user_id:
                        has_access = True
                        break

    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this project."
        )

    return {
        "project_id": x_project_id,
        "account_id": user_id,
        "email": email
    }

def get_current_user(
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Dict[str, Any]:
    """Resolves and validates active user session using Supabase JWT or in-memory fallback."""
    if not bearer_auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Token. Pass 'Authorization: Bearer <token>'."
        )

    token = bearer_auth.credentials
    sp = get_supabase()

    if sp:
        try:
            user_res = sp.auth.get_user(token)
            if user_res and user_res.user:
                u = user_res.user
                return {
                    "id": u.id,
                    "email": u.email,
                    "github_username": u.user_metadata.get("user_name") or u.user_metadata.get("preferred_username")
                }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired user session: {str(e)}"
            )

    # In-memory mock fallback for testing
    if token.startswith("mock_user_"):
        parts = token.split("_")
        user_id = parts[2] if len(parts) > 2 else "00000000-0000-0000-0000-000000000001"
        email = f"{parts[2]}@contexthub.dev" if len(parts) > 2 else "demo@contexthub.dev"
        return {
            "id": user_id,
            "email": email,
            "github_username": parts[2] if len(parts) > 2 else "demo_github"
        }

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized user session."
    )

