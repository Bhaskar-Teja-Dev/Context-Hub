import uuid
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.auth import get_current_project
from app.schemas import SessionEndRequest, SessionResponse
from app.database import get_supabase, db_mem

router = APIRouter(prefix="/api/v1/sessions", tags=["Session Summaries"])

@router.post("", response_model=SessionResponse)
def end_session(
    payload: SessionEndRequest,
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Stores a session summary permanently when an AI agent finishes a task session."""
    project_id = current_project["project_id"]
    session_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    sp = get_supabase()

    if sp:
        try:
            res = sp.table("sessions").insert({
                "id": session_id,
                "project_id": project_id,
                "agent_name": payload.agent_name,
                "summary": payload.summary,
                "added": payload.added,
                "changed": payload.changed,
                "removed": payload.removed,
                "known_issues": payload.known_issues,
                "created_at": now_str
            }).execute()

            data = res.data[0] if res.data else {}
            return SessionResponse(
                id=data.get("id", session_id),
                project_id=project_id,
                agent_name=payload.agent_name,
                summary=payload.summary,
                added=payload.added,
                changed=payload.changed,
                removed=payload.removed,
                known_issues=payload.known_issues,
                created_at=data.get("created_at", now_str)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    db_mem.sessions[session_id] = {
        "id": session_id,
        "project_id": project_id,
        "agent_name": payload.agent_name,
        "summary": payload.summary,
        "added": payload.added,
        "changed": payload.changed,
        "removed": payload.removed,
        "known_issues": payload.known_issues,
        "created_at": now_str
    }

    return SessionResponse(
        id=session_id,
        project_id=project_id,
        agent_name=payload.agent_name,
        summary=payload.summary,
        added=payload.added,
        changed=payload.changed,
        removed=payload.removed,
        known_issues=payload.known_issues,
        created_at=now_str
    )

@router.get("", response_model=List[SessionResponse])
def list_sessions(current_project: Dict[str, Any] = Depends(get_current_project)):
    """Lists past agent sessions for the project."""
    project_id = current_project["project_id"]
    sp = get_supabase()

    if sp:
        try:
            res = sp.table("sessions").select("*").eq("project_id", project_id).order("created_at", desc=True).execute()
            return res.data or []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    sessions = [s for s in db_mem.sessions.values() if s["project_id"] == project_id]
    sessions.sort(key=lambda x: x["created_at"], reverse=True)
    return sessions
