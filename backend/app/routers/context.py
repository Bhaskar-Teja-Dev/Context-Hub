import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from app.auth import get_current_project
from app.schemas import DocumentCreate, DocumentResponse, FullContextResponse
from app.embeddings import generate_embedding
from app.database import get_supabase, db_mem

router = APIRouter(prefix="/api/v1/context", tags=["Context Memory"])

@router.get("", response_model=FullContextResponse)
def get_full_context(current_project: Dict[str, Any] = Depends(get_current_project)):
    """Retrieves full structured project context (documents, decisions, tasks, features)."""
    project_id = current_project["project_id"]
    sp = get_supabase()

    if sp:
        try:
            p_res = sp.table("projects").select("name").eq("id", project_id).execute()
            p_name = p_res.data[0]["name"] if p_res.data else "Project"

            docs_res = sp.table("documents").select("id, project_id, category, title, body, created_at, updated_at").eq("project_id", project_id).execute()
            decs_res = sp.table("decisions").select("id, project_id, title, reason, alternatives, impact, decided_at").eq("project_id", project_id).execute()
            tasks_res = sp.table("tasks").select("*").eq("project_id", project_id).neq("status", "completed").execute()
            feats_res = sp.table("features").select("*").eq("project_id", project_id).execute()

            return FullContextResponse(
                project_id=project_id,
                project_name=p_name,
                documents=docs_res.data or [],
                decisions=decs_res.data or [],
                active_tasks=tasks_res.data or [],
                features=feats_res.data or []
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

    # In-memory fallback
    p_name = db_mem.projects.get(project_id, {}).get("name", "Demo Project")
    docs = [d for d in db_mem.documents.values() if d["project_id"] == project_id]
    decs = [d for d in db_mem.decisions.values() if d["project_id"] == project_id]
    tsks = [t for t in db_mem.tasks.values() if t["project_id"] == project_id and t["status"] != "completed"]
    fts = [f for f in db_mem.features.values() if f["project_id"] == project_id]

    return FullContextResponse(
        project_id=project_id,
        project_name=p_name,
        documents=docs,
        decisions=decs,
        active_tasks=tsks,
        features=fts
    )

@router.post("", response_model=DocumentResponse)
def update_context_doc(
    payload: DocumentCreate,
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Adds or updates a context document (architecture, requirements, api, etc.) with vector embedding."""
    project_id = current_project["project_id"]
    now_str = datetime.now(timezone.utc).isoformat()
    embedding = generate_embedding(f"{payload.title} {payload.category} {payload.body}")
    sp = get_supabase()

    if sp:
        try:
            # Upsert document by project_id, category, title
            existing = sp.table("documents").select("id").eq("project_id", project_id).eq("category", payload.category).eq("title", payload.title).execute()
            if existing.data and len(existing.data) > 0:
                doc_id = existing.data[0]["id"]
                res = sp.table("documents").update({
                    "body": payload.body,
                    "embedding": embedding,
                    "updated_at": now_str
                }).eq("id", doc_id).execute()
            else:
                doc_id = str(uuid.uuid4())
                res = sp.table("documents").insert({
                    "id": doc_id,
                    "project_id": project_id,
                    "category": payload.category,
                    "title": payload.title,
                    "body": payload.body,
                    "embedding": embedding,
                    "created_at": now_str,
                    "updated_at": now_str
                }).execute()
            
            data = res.data[0] if res.data else {}
            return DocumentResponse(
                id=data.get("id", doc_id),
                project_id=project_id,
                category=payload.category,
                title=payload.title,
                body=payload.body,
                created_at=data.get("created_at", now_str),
                updated_at=data.get("updated_at", now_str)
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database update error: {str(e)}")

    # In-memory fallback
    doc_id = str(uuid.uuid4())
    for d in db_mem.documents.values():
        if d["project_id"] == project_id and d["category"] == payload.category and d["title"] == payload.title:
            doc_id = d["id"]
            break

    db_mem.documents[doc_id] = {
        "id": doc_id,
        "project_id": project_id,
        "category": payload.category,
        "title": payload.title,
        "body": payload.body,
        "embedding": embedding,
        "created_at": db_mem.documents.get(doc_id, {}).get("created_at", now_str),
        "updated_at": now_str
    }

    return DocumentResponse(
        id=doc_id,
        project_id=project_id,
        category=payload.category,
        title=payload.title,
        body=payload.body,
        created_at=db_mem.documents[doc_id]["created_at"],
        updated_at=now_str
    )

@router.get("/search", response_model=List[DocumentResponse])
def search_context(
    query: str = Query(..., description="Semantic search query string"),
    category: Optional[str] = Query(None, description="Optional category filter"),
    limit: int = Query(5, description="Maximum number of results"),
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Semantic vector search over project context documents using pgvector or in-memory cosine similarity."""
    project_id = current_project["project_id"]
    query_emb = generate_embedding(query)
    sp = get_supabase()

    if sp:
        try:
            rpc_res = sp.rpc("match_documents", {
                "query_embedding": query_emb,
                "match_threshold": 0.0,
                "match_count": limit,
                "filter_project_id": project_id,
                "filter_category": category
            }).execute()
            return rpc_res.data or []
        except Exception as e:
            # Fallback to direct query if RPC not yet created
            pass

    # In-memory cosine similarity search
    results = []
    for d in db_mem.documents.values():
        if d["project_id"] != project_id:
            continue
        if category and d["category"] != category:
            continue
        
        emb = d.get("embedding")
        sim = 0.0
        if emb and len(emb) == len(query_emb):
            dot = sum(a * b for a, b in zip(emb, query_emb))
            norm_a = sum(a * a for a in emb) ** 0.5
            norm_b = sum(b * b for b in query_emb) ** 0.5
            sim = dot / (norm_a * norm_b) if norm_a > 0 and norm_b > 0 else 0.0
        elif query.lower() in d["title"].lower() or query.lower() in d["body"].lower():
            sim = 0.8  # Text match fallback

        results.append(DocumentResponse(
            id=d["id"],
            project_id=d["project_id"],
            category=d["category"],
            title=d["title"],
            body=d["body"],
            created_at=d["created_at"],
            updated_at=d["updated_at"],
            similarity=float(sim)
        ))

    results.sort(key=lambda x: x.similarity or 0.0, reverse=True)
    return results[:limit]

@router.get("/list", response_model=List[DocumentResponse])
def list_documents(
    category: Optional[str] = Query(None, description="Optional category filter"),
    current_project: Dict[str, Any] = Depends(get_current_project)
):
    """Lists document entries for the project."""
    project_id = current_project["project_id"]
    sp = get_supabase()

    if sp:
        try:
            q = sp.table("documents").select("id, project_id, category, title, body, created_at, updated_at").eq("project_id", project_id)
            if category:
                q = q.eq("category", category)
            res = q.execute()
            return res.data or []
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

    docs = [d for d in db_mem.documents.values() if d["project_id"] == project_id]
    if category:
        docs = [d for d in docs if d["category"] == category]
    return docs
