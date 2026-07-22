import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from app.routers import health, projects, context, decisions, features, sessions
from app.mcp_server import mcp_app
from mcp.server.sse import SseServerTransport

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("contexthub")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly load model on startup to avoid request-time timeouts
    logger.info("Eagerly loading embedding model...")
    try:
        from app.embeddings import get_embedding_model
        get_embedding_model()
    except Exception as e:
        logger.error(f"Error loading embedding model on startup: {e}")
    yield

app = FastAPI(
    title="ContextHub API & MCP Server",
    description="One source of truth for AI coding assistants. Structured project memory accessible via MCP and REST.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for Next.js Developer Dashboard
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(context.router)
app.include_router(decisions.router)
app.include_router(features.router)
app.include_router(sessions.router)

# MCP SSE Transport endpoint setup
sse_transport = SseServerTransport("/messages/")

@app.get("/sse")
async def handle_sse(request: Request):
    """MCP SSE endpoint allowing MCP client agents to connect over HTTP/SSE."""
    async with sse_transport.connect_sse(request.scope, request.receive, request._send) as (read_stream, write_stream):
        await mcp_app.run(read_stream, write_stream, mcp_app.create_initialization_options())

@app.post("/messages/")
async def handle_messages(request: Request):
    """MCP message endpoint for SSE transport communication."""
    await sse_transport.handle_post_message(request.scope, request.receive, request._send)

@app.get("/")
def root():
    return {
        "service": "ContextHub Backend",
        "docs": "/docs",
        "health": "/health",
        "mcp_sse_endpoint": "/sse",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    from app.config import settings
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
