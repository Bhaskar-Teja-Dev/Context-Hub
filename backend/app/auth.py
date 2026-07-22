from fastapi import Header, HTTPException, Security, status
from fastapi.security import APIKeyHeader, HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
from app.database import validate_api_key_db, get_supabase

api_key_header_scheme = APIKeyHeader(name="X-API-Key", auto_error=False)
bearer_scheme = HTTPBearer(auto_error=False)

def get_current_project(
    x_api_key: Optional[str] = Security(api_key_header_scheme),
    bearer_auth: Optional[HTTPAuthorizationCredentials] = Security(bearer_scheme)
) -> Dict[str, Any]:
    token = x_api_key
    if not token and bearer_auth:
        token = bearer_auth.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API Key. Pass 'X-API-Key' header or 'Authorization: Bearer <key>'."
        )

    project_info = validate_api_key_db(token)
    if not project_info:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API Key."
        )

    return project_info

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

