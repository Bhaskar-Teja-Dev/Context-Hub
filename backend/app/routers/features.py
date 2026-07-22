import uuid
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from datetime import datetime, timezone
from app.auth import get_current_project
from app.schemas import FeatureCreate, FeatureLinkCreate, FeatureResponse, FeatureStatusUpdate
from app.database import get_supabase, db_mem

router = APIRouter(prefix="/api/v1/features", tags=["Feature Timeline & Graph"])

@router.post("", response_model=FeatureResponse)
def add_feature(
    payload: FeatureCreate,
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Adds a new feature entry to the project timeline."""
    project_id = current_project["project_id"]
    feature_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    sp = get_supabase()

    if sp:
        try:
            res = sp.table("features").insert({
                "id": feature_id,
                "project_id": project_id,
                "name": payload.name,
                "status": "created",
                "created_at": now_str,
                "updated_at": now_str
            }).execute()

            data = res.data[0] if res.data else {}
            return FeatureResponse(
                id=data.get("id", feature_id),
                project_id=project_id,
                name=payload.name,
                status="created",
                created_at=data.get("created_at", now_str),
                updated_at=data.get("updated_at", now_str)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    db_mem.features[feature_id] = {
        "id": feature_id,
        "project_id": project_id,
        "name": payload.name,
        "status": "created",
        "created_at": now_str,
        "updated_at": now_str,
        "deprecated_at": None
    }

    return FeatureResponse(
        id=feature_id,
        project_id=project_id,
        name=payload.name,
        status="created",
        created_at=now_str,
        updated_at=now_str
    )

@router.post("/link", response_model=Dict[str, Any])
def link_features(
    payload: FeatureLinkCreate,
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Links two features with a relationship (implements, depends_on, uses, introduced_by)."""
    edge_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()
    sp = get_supabase()

    if sp:
        try:
            res = sp.table("feature_edges").insert({
                "id": edge_id,
                "feature_id": payload.feature_id,
                "related_feature_id": payload.related_feature_id,
                "relation": payload.relation,
                "created_at": now_str
            }).execute()

            return res.data[0] if res.data else {
                "id": edge_id,
                "feature_id": payload.feature_id,
                "related_feature_id": payload.related_feature_id,
                "relation": payload.relation
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    db_mem.feature_edges[edge_id] = {
        "id": edge_id,
        "feature_id": payload.feature_id,
        "related_feature_id": payload.related_feature_id,
        "relation": payload.relation,
        "created_at": now_str
    }

    return db_mem.feature_edges[edge_id]
