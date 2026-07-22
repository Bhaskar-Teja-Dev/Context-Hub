# ContextHub — Universal Shared AI Project Memory (MVP)

> **One source of truth for AI coding assistants.**

ContextHub is a persistent, project-wide memory layer accessible via standard **Model Context Protocol (MCP)** and **REST API**. Context follows the *project*, not the chat session — so switching between Claude Code, Cursor, Windsurf, ChatGPT, or Gemini CLI never means re-explaining architecture, decisions, or open tasks.

---

## 🌟 Key Features

- **Multi-Agent Persistent Memory**: Store project architecture, constraints, API specs, schemas, and coding standards.
- **pgvector Semantic Search**: Fast vector similarity search over stored documents and decisions using a zero-cost, in-process embedding engine (`sentence-transformers`, `all-MiniLM-L6-v2`, 384 dimensions).
- **Architectural Decision Log**: Prevent agents from undoing prior design choices (`decision.add` and `decision.search`).
- **Audit Trail & Session Summaries**: Automatically record session accomplishments when an agent completes work (`session.end`).
- **Multi-Tenant Security**: Isolated data per project via hashed API keys (`ch_live_...`).
- **$0/Month Hosting Stack**: Deployable on Supabase free tier + Render free web service + Vercel Hobby dashboard.

---

## 🏗️ Architecture

```
                       ┌───────────────────────────┐
                       │   Next.js Dashboard       │  → Vercel Hobby (free)
                       │  (project view, API keys) │
                       └─────────────┬─────────────┘
                                     │ HTTPS
                       ┌─────────────▼─────────────┐
                       │   FastAPI Backend         │  → Render Free Service
                       │   - REST API              │     (MCP over SSE / stdio)
                       │   - MCP Server            │
                       │   - Local embedding model │
                       └─────────────┬─────────────┘
                                     │
                       ┌─────────────▼─────────────┐
                       │  Supabase (pgvector)      │  → Supabase Free
                       │  - HNSW Vector Indexes    │
                       └───────────────────────────┘

         Claude Code · Cursor · Windsurf · Codex CLI ──MCP──┐
         Gemini CLI · ChatGPT (Actions) · REST API   ──REST─┴──► FastAPI Backend
```

---

## ⚡ Quickstart

### 1. Database Setup (Supabase)

Initialize database schema and pgvector indexes via Supabase CLI or SQL editor:

```bash
# Using Supabase CLI
supabase start
supabase db push

# Or apply schema directly to your Supabase project:
# Executing supabase/schema.sql in the Supabase SQL Editor
```

### 2. Backend Setup (FastAPI + MCP Server)

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env

# Run server
uvicorn app.main:app --reload --port 8000
```

- API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/health`
- MCP SSE Endpoint: `http://localhost:8000/sse`

### 3. Developer Dashboard (Next.js)

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000` to manage projects, API keys, search context, and view session logs.

---

## 🔌 Connecting AI Coding Assistants

Add ContextHub to your agent config (`.claude.json`, `mcp_config.json`, etc.):

```json
{
  "mcpServers": {
    "contexthub": {
      "command": "c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\venv\\Scripts\\python.exe",
      "args": ["c:\\Users\\bhask\\OneDrive\\Desktop\\Context-Hub\\backend\\app\\mcp_server.py"],
      "env": {
        "CONTEXTHUB_API_KEY": "ch_live_YOUR_API_KEY_HERE",
        "CONTEXTHUB_PROJECT_ID": "YOUR_PROJECT_UUID_HERE"
      }
    }
  }
}
```

### Supported MCP Tools

- `context.get`: Fetch all project memory (architecture, decisions, active tasks).
- `context.search`: Semantic vector search over stored context.
- `context.update`: Write/update a context entry.
- `decision.add`: Log an architectural decision with rationale.
- `decision.search`: Query past architectural decisions.
- `session.end`: Record session accomplishments & audit trail.

---

## 🧪 Running Tests

```bash
cd backend
pytest
```
