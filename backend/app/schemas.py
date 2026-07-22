from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

# --- Auth & Project ---
class ProjectCreate(BaseModel):
    name: str = Field(..., description="Project name")
    description: Optional[str] = Field(None, description="Optional project description")
    email: str = Field(..., description="Account owner email")

class ProjectResponse(BaseModel):
    id: str
    account_id: str
    name: str
    description: Optional[str] = None
    created_at: str

class APIKeyCreateResponse(BaseModel):
    id: str
    project_id: str
    key: str  # Full raw API key shown only once
    prefix: str
    name: str
    created_at: str

class APIKeyInfo(BaseModel):
    id: str
    project_id: str
    prefix: str
    name: str
    created_at: str
    last_used_at: Optional[str] = None

# --- Documents / Context ---
class DocumentCreate(BaseModel):
    category: str = Field(..., description="architecture | requirement | constraint | api | schema | coding_standard")
    title: str = Field(..., description="Document title")
    body: str = Field(..., description="Document content body")

class DocumentResponse(BaseModel):
    id: str
    project_id: str
    category: str
    title: str
    body: str
    created_at: str
    updated_at: str
    similarity: Optional[float] = None

class ContextSearchQuery(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 5

class FullContextResponse(BaseModel):
    project_id: str
    project_name: str
    documents: List[DocumentResponse]
    decisions: List[Dict[str, Any]]
    active_tasks: List[Dict[str, Any]]
    features: List[Dict[str, Any]]

# --- Decisions ---
class DecisionCreate(BaseModel):
    title: str = Field(..., description="Decision title")
    reason: str = Field(..., description="Why this decision was made")
    alternatives: Optional[str] = Field(None, description="Alternatives considered")
    impact: Optional[str] = Field(None, description="Impact of decision")

class DecisionResponse(BaseModel):
    id: str
    project_id: str
    title: str
    reason: str
    alternatives: Optional[str] = None
    impact: Optional[str] = None
    decided_at: str
    similarity: Optional[float] = None

class DecisionSearchQuery(BaseModel):
    query: str
    limit: int = 5

# --- Features & Graph ---
class FeatureCreate(BaseModel):
    name: str = Field(..., description="Feature name")

class FeatureStatusUpdate(BaseModel):
    status: str = Field(..., description="created | modified | deprecated | removed")

class FeatureLinkCreate(BaseModel):
    feature_id: str
    related_feature_id: str
    relation: str = Field(..., description="implements | depends_on | uses | introduced_by")

class FeatureResponse(BaseModel):
    id: str
    project_id: str
    name: str
    status: str
    created_at: str
    updated_at: str
    deprecated_at: Optional[str] = None

# --- Tasks ---
class TaskCreate(BaseModel):
    title: str
    status: str = "open"

class TaskResponse(BaseModel):
    id: str
    project_id: str
    title: str
    status: str
    created_at: str
    updated_at: str

# --- Sessions ---
class SessionEndRequest(BaseModel):
    agent_name: str = Field(..., description="Name of AI agent (e.g. Claude Code, Cursor)")
    summary: str = Field(..., description="Summary of session accomplishments")
    added: List[str] = Field(default_factory=list, description="Items added")
    changed: List[str] = Field(default_factory=list, description="Items changed")
    removed: List[str] = Field(default_factory=list, description="Items removed")
    known_issues: List[str] = Field(default_factory=list, description="Open known issues")

class SessionResponse(BaseModel):
    id: str
    project_id: str
    agent_name: str
    summary: str
    added: List[str]
    changed: List[str]
    removed: List[str]
    known_issues: List[str]
    created_at: str

# --- Agent Notes ---
class AgentNoteUpdate(BaseModel):
    agent_name: str
    note: str
