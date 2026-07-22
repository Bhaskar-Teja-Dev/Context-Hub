import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import db_mem

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "service" in data

def _create_project_and_api_key():
    payload = {
        "name": "Test Suite Project",
        "description": "Integration test project",
        "email": "tester@contexthub.dev"
    }
    response = client.post("/api/v1/projects", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "project" in data
    assert "api_key" in data
    assert data["api_key"].startswith("ch_live_")
    return data["api_key"], data["project"]["id"]

def test_create_project_and_api_key():
    api_key, project_id = _create_project_and_api_key()
    assert api_key is not None
    assert project_id is not None

def test_context_operations():
    api_key, project_id = _create_project_and_api_key()
    headers = {"X-API-Key": api_key}

    # 1. Update Context
    doc_payload = {
        "category": "architecture",
        "title": "Microservices Architecture",
        "body": "FastAPI backend handles REST and MCP requests using sentence-transformers for local vector search."
    }
    resp = client.post("/api/v1/context", json=doc_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Microservices Architecture"

    # 2. Get Full Context
    resp = client.get("/api/v1/context", headers=headers)
    assert resp.status_code == 200
    ctx = resp.json()
    assert len(ctx["documents"]) >= 1

    # 3. Semantic Search
    resp = client.get("/api/v1/context/search?query=fastapi", headers=headers)
    assert resp.status_code == 200
    search_results = resp.json()
    assert len(search_results) >= 1

def test_decision_operations():
    api_key, _ = _create_project_and_api_key()
    headers = {"X-API-Key": api_key}

    dec_payload = {
        "title": "Use Supabase with pgvector",
        "reason": "Offers Postgres database, vector similarity search, and realtime change feeds for zero cost.",
        "alternatives": "Self-hosted Postgres or Pinecone",
        "impact": "Keeps MVP infra cost at $0/month."
    }
    resp = client.post("/api/v1/decisions", json=dec_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Use Supabase with pgvector"

    # Search decisions
    resp = client.get("/api/v1/decisions/search?query=pgvector", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

def test_session_end_operations():
    api_key, _ = _create_project_and_api_key()
    headers = {"X-API-Key": api_key}

    session_payload = {
        "agent_name": "Claude Code",
        "summary": "Implemented database schema and FastAPI backend.",
        "added": ["schema.sql", "main.py"],
        "changed": ["task.md"],
        "removed": [],
        "known_issues": ["Need dashboard UI"]
    }
    resp = client.post("/api/v1/sessions", json=session_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["agent_name"] == "Claude Code"
