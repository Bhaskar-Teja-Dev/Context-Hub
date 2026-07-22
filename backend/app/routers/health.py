from fastapi import APIRouter
from app.database import get_supabase
from datetime import datetime, timezone

router = APIRouter(prefix="/health", tags=["Health & Maintenance"])

@router.get("")
def health_check():
    """Health check endpoint to keep Render web service and Supabase active."""
    db_status = "healthy (in-memory)"
    sp = get_supabase()
    if sp:
        try:
            # Lightweight count query to keep Supabase warm
            sp.table("accounts").select("id", count="exact").limit(1).execute()
            db_status = "healthy (supabase)"
        except Exception as e:
            db_status = f"error ({str(e)})"

    return {
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "service": "ContextHub Backend"
    }
