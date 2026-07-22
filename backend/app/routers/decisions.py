import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.auth import get_current_project
from app.schemas import DecisionCreate, DecisionResponse
from app.embeddings import generate_embedding
from app.database import get_supabase, db_mem

router = APIRouter(prefix="/api/v1/decisions", tags=["Decision Log"])

@router.post("", response_model=DecisionResponse)
def add_decision(
    payload: DecisionCreate,
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Logs an architectural decision with reasons, alternatives, impact, and vector embedding."""
    project_id = current_project["project_id"]
    now_str = datetime.now(timezone.utc).isoformat()
    text_to_embed = f"{payload.title} {payload.reason} {payload.alternatives or ''} {payload.impact or ''}"
    embedding = generate_embedding(text_to_embed)
    sp = get_supabase()

    decision_id = str(uuid.uuid4())

    if sp:
        try:
            res = sp.table("decisions").insert({
                "id": decision_id,
                "project_id": project_id,
                "title": payload.title,
                "reason": payload.reason,
                "alternatives": payload.alternatives,
                "impact": payload.impact,
                "decided_at": now_str,
                "embedding": embedding
            }).execute()

            data = res.data[0] if res.data else {}
            return DecisionResponse(
                id=data.get("id", decision_id),
                project_id=project_id,
                title=payload.title,
                reason=payload.reason,
                alternatives=payload.alternatives,
                impact=payload.impact,
                decided_at=data.get("decided_at", now_str)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory fallback
    db_mem.decisions[decision_id] = {
        "id": decision_id,
        "project_id": project_id,
        "title": payload.title,
        "reason": payload.reason,
        "alternatives": payload.alternatives,
        "impact": payload.impact,
        "decided_at": now_str,
        "embedding": embedding
    }

    return DecisionResponse(
        id=decision_id,
        project_id=project_id,
        title=payload.title,
        reason=payload.reason,
        alternatives=payload.alternatives,
        impact=payload.impact,
        decided_at=now_str
    )

@router.get("/search", response_model=List[DecisionResponse])
def search_decisions(
    query: str = Query(..., description="Query to find relevant architectural decisions"),
    limit: int = Query(5, description="Max results"),
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Semantic vector search over past decisions."""
    project_id = current_project["project_id"]
    query_emb = generate_embedding(query)
    sp = get_supabase()

    if sp:
        try:
            rpc_res = sp.rpc("match_decisions", {
                "query_embedding": query_emb,
                "match_threshold": 0.0,
                "match_count": limit,
                "filter_project_id": project_id
            }).execute()
            return rpc_res.data or []
        except Exception as e:
            pass

    # In-memory search fallback
    results = []
    for d in db_mem.decisions.values():
        if d["project_id"] != project_id:
            continue
        emb = d.get("embedding")
        sim = 0.0
        if emb and len(emb) == len(query_emb):
            dot = sum(a * b for a, b in zip(emb, query_emb))
            norm_a = sum(a * a for a in emb) ** 0.5
            norm_b = sum(b * b for b in query_emb) ** 0.5
            sim = dot / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0
        elif query.lower() in d["title"].lower() or query.lower() in d["reason"].lower():
            sim = 0.85

        results.append(DecisionResponse(
            id=d["id"],
            project_id=d["project_id"],
            title=d["title"],
            reason=d["reason"],
            alternatives=d.get("alternatives"),
            impact=d.get("impact"),
            decided_at=d["decided_at"],
            similarity=float(sim)
        ))

    results.sort(key=lambda x: x.similarity or 0.0, reverse=True)
    return results[:limit]
