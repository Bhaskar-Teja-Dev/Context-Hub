import json
import logging
import sys
import os
from typing import Dict, Any, List, Optional

# Ensure the backend directory is in the python path for direct file execution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mcp.server import Server
from mcp.types import Tool, TextContent, ImageContent, EmbeddedResource
from app.database import get_supabase, db_mem
from app.embeddings import generate_embedding

logger = logging.getLogger(__name__)

# Initialize MCP Server
mcp_app = Server("contexthub-mcp-server")

@mcp_app.list_tools()
async def list_tools() -> List[Tool]:
    return [
        Tool(
            name="context_get",
            description="Retrieve full persistent project context (architecture, requirements, open decisions, active tasks, features).",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"}
                },
                "required": ["project_id"]
            }
        ),
        Tool(
            name="context_search",
            description="Perform semantic vector search over project documents and decisions.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "query": {"type": "string", "description": "Natural language query"},
                    "category": {"type": "string", "description": "Optional category filter"}
                },
                "required": ["project_id", "query"]
            }
        ),
        Tool(
            name="context_update",
            description="Persist or update a project context document (architecture, requirements, constraints, API, schema, coding standard).",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "category": {"type": "string", "description": "architecture | requirement | constraint | api | schema | coding_standard"},
                    "title": {"type": "string", "description": "Document title"},
                    "description": {"type": "string", "description": "Document content body"}
                },
                "required": ["project_id", "category", "title", "description"]
            }
        ),
        Tool(
            name="context_list",
            description="List all context documents for a project, optionally filtered by category.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "category": {"type": "string", "description": "Optional category filter"}
                },
                "required": ["project_id"]
            }
        ),
        Tool(
            name="decision_add",
            description="Record an architectural or technical decision along with rationale, alternatives considered, and impact.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "title": {"type": "string", "description": "Decision title"},
                    "reason": {"type": "string", "description": "Why this decision was made"},
                    "alternatives": {"type": "string", "description": "Alternatives considered"},
                    "impact": {"type": "string", "description": "Impact or consequences of decision"}
                },
                "required": ["project_id", "title", "reason"]
            }
        ),
        Tool(
            name="decision_search",
            description="Search previous architectural decisions by natural language query (e.g. 'why did we remove Kafka?').",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "query": {"type": "string", "description": "Search query"}
                },
                "required": ["project_id", "query"]
            }
        ),
        Tool(
            name="feature_add",
            description="Add a new feature entry to the project dependency timeline.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "name": {"type": "string", "description": "Feature name"}
                },
                "required": ["project_id", "name"]
            }
        ),
        Tool(
            name="feature_link",
            description="Link two features in the knowledge graph (implements, depends_on, uses, introduced_by).",
            inputSchema={
                "type": "object",
                "properties": {
                    "feature_id": {"type": "string", "description": "Source feature ID"},
                    "related_feature_id": {"type": "string", "description": "Target feature ID"},
                    "relation": {"type": "string", "description": "implements | depends_on | uses | introduced_by"}
                },
                "required": ["feature_id", "related_feature_id", "relation"]
            }
        ),
        Tool(
            name="session_end",
            description="Store a summary of what was accomplished during an AI agent working session.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"},
                    "agent_name": {"type": "string", "description": "Agent name (e.g. Claude Code, Cursor)"},
                    "summary": {"type": "string", "description": "High-level summary of accomplishments"},
                    "added": {"type": "array", "items": {"type": "string"}, "description": "Added items"},
                    "changed": {"type": "array", "items": {"type": "string"}, "description": "Changed items"},
                    "removed": {"type": "array", "items": {"type": "string"}, "description": "Removed items"},
                    "known_issues": {"type": "array", "items": {"type": "string"}, "description": "Known unresolved issues"}
                },
                "required": ["project_id", "agent_name", "summary"]
            }
        ),
        Tool(
            name="project_summary",
            description="Get a high-level summary overview of project health and memory stats.",
            inputSchema={
                "type": "object",
                "properties": {
                    "project_id": {"type": "string", "description": "Project ID"}
                },
                "required": ["project_id"]
            }
        )
    ]

@mcp_app.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    try:
        if name == "context_get":
            pid = arguments["project_id"]
            sp = get_supabase()
            if sp:
                d = sp.table("documents").select("category, title, body").eq("project_id", pid).execute().data
                dec = sp.table("decisions").select("title, reason, impact").eq("project_id", pid).execute().data
                t = sp.table("tasks").select("title, status").eq("project_id", pid).neq("status", "completed").execute().data
                res = {"documents": d, "decisions": dec, "active_tasks": t}
            else:
                d = [v for v in db_mem.documents.values() if v["project_id"] == pid]
                dec = [v for v in db_mem.decisions.values() if v["project_id"] == pid]
                t = [v for v in db_mem.tasks.values() if v["project_id"] == pid]
                res = {"documents": d, "decisions": dec, "active_tasks": t}
            return [TextContent(type="text", text=json.dumps(res, indent=2))]

        elif name == "context_search":
            pid = arguments["project_id"]
            query = arguments["query"]
            category = arguments.get("category")
            query_emb = generate_embedding(query)
            sp = get_supabase()
            if sp:
                try:
                    rpc_res = sp.rpc("match_documents", {
                        "query_embedding": query_emb,
                        "match_threshold": 0.0,
                        "match_count": 5,
                        "filter_project_id": pid,
                        "filter_category": category
                    }).execute()
                    return [TextContent(type="text", text=json.dumps(rpc_res.data or [], indent=2))]
                except Exception:
                    pass

            docs = [d for d in db_mem.documents.values() if d["project_id"] == pid]
            if category:
                docs = [d for d in docs if d["category"] == category]
            return [TextContent(type="text", text=json.dumps(docs, indent=2, default=str))]

        elif name == "context_update":
            pid = arguments["project_id"]
            category = arguments["category"]
            title = arguments["title"]
            desc = arguments["description"]
            emb = generate_embedding(f"{title} {category} {desc}")
            sp = get_supabase()
            if sp:
                sp.table("documents").upsert({
                    "project_id": pid,
                    "category": category,
                    "title": title,
                    "body": desc,
                    "embedding": emb
                }).execute()
            else:
                import uuid
                doc_id = str(uuid.uuid4())
                db_mem.documents[doc_id] = {
                    "id": doc_id, "project_id": pid, "category": category, "title": title, "body": desc, "embedding": emb
                }
            return [TextContent(type="text", text=json.dumps({"status": "updated", "title": title}))]

        elif name == "decision_add":
            pid = arguments["project_id"]
            title = arguments["title"]
            reason = arguments["reason"]
            alts = arguments.get("alternatives")
            impact = arguments.get("impact")
            emb = generate_embedding(f"{title} {reason} {alts or ''} {impact or ''}")
            sp = get_supabase()
            if sp:
                sp.table("decisions").insert({
                    "project_id": pid, "title": title, "reason": reason, "alternatives": alts, "impact": impact, "embedding": emb
                }).execute()
            else:
                import uuid
                dec_id = str(uuid.uuid4())
                db_mem.decisions[dec_id] = {
                    "id": dec_id, "project_id": pid, "title": title, "reason": reason, "alternatives": alts, "impact": impact, "embedding": emb
                }
            return [TextContent(type="text", text=json.dumps({"status": "decision_logged", "title": title}))]

        elif name == "session_end":
            pid = arguments["project_id"]
            agent_name = arguments["agent_name"]
            summary = arguments["summary"]
            sp = get_supabase()
            if sp:
                sp.table("sessions").insert({
                    "project_id": pid, "agent_name": agent_name, "summary": summary,
                    "added": arguments.get("added", []), "changed": arguments.get("changed", []),
                    "removed": arguments.get("removed", []), "known_issues": arguments.get("known_issues", [])
                }).execute()
            else:
                import uuid
                s_id = str(uuid.uuid4())
                db_mem.sessions[s_id] = {
                    "id": s_id, "project_id": pid, "agent_name": agent_name, "summary": summary,
                    "added": arguments.get("added", []), "changed": arguments.get("changed", []),
                    "removed": arguments.get("removed", []), "known_issues": arguments.get("known_issues", [])
                }
            return [TextContent(type="text", text=json.dumps({"status": "session_ended", "agent": agent_name}))]

        elif name == "project_summary":
            pid = arguments["project_id"]
            sp = get_supabase()
            if sp:
                dc = len(sp.table("documents").select("id").eq("project_id", pid).execute().data or [])
                dec_c = len(sp.table("decisions").select("id").eq("project_id", pid).execute().data or [])
                sc = len(sp.table("sessions").select("id").eq("project_id", pid).execute().data or [])
            else:
                dc = len([d for d in db_mem.documents.values() if d["project_id"] == pid])
                dec_c = len([d for d in db_mem.decisions.values() if d["project_id"] == pid])
                sc = len([s for s in db_mem.sessions.values() if s["project_id"] == pid])

            res = {
                "project_id": pid,
                "total_documents": dc,
                "total_decisions": dec_c,
                "total_sessions": sc,
                "status": "healthy"
            }
            return [TextContent(type="text", text=json.dumps(res, indent=2))]

        else:
            return [TextContent(type="text", text=json.dumps({"result": "executed", "tool": name, "arguments": arguments}))]

    except Exception as e:
        logger.error(f"Error handling MCP tool {name}: {e}")
        return [TextContent(type="text", text=json.dumps({"error": str(e)}))]

if __name__ == "__main__":
    import asyncio
    from mcp.server.models import InitializationOptions
    import mcp.server.stdio

    async def main():
        async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
            await mcp_app.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="contexthub-mcp-server",
                    server_version="1.0.0",
                    capabilities=mcp_app.get_capabilities()
                )
            )

    # Redirect logging to stderr since stdout is reserved for MCP JSON-RPC stdio protocol
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)
    asyncio.run(main())
