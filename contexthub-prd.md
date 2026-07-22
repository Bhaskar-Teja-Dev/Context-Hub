# ContextHub — Product Requirements Document (MVP)

**Status:** Draft v1
**Owner:** [you]
**Target:** Buildable and shippable at $0/month infra cost, with a clear upgrade path to a paid product.

---

## 1. Problem Statement

AI coding assistants (Claude Code, Cursor, Gemini CLI, ChatGPT, Windsurf, Codex CLI, etc.) have no persistent, project-wide memory that stays synchronized across tools, devices, repos, and developers. Every new session starts from partial context, forcing developers to manually re-explain architecture, decisions, and open work — or accept an agent that's guessing.

## 2. Vision

> **One source of truth for AI coding assistants.**

ContextHub is a shared, structured memory layer that any MCP-compatible agent can read from and write to. Context follows the *project*, not the chat session — so switching from Claude Code to Cursor to ChatGPT never means starting over.

## 3. Goals (MVP)

- Ship a working product other developers can sign up for and use, at $0 hosting cost.
- Support structured project memory (architecture, decisions, tasks, session summaries) accessible via MCP.
- Support "as many agents as possible" from day one: any MCP-compatible client (Claude Code, Cursor, Windsurf, Codex CLI) out of the box, plus a REST fallback for non-MCP clients (ChatGPT via custom GPT/Actions, Gemini CLI, plain HTTP).
- Multi-tenant from the start (accounts, projects, API keys) since this may become a paid product — retrofitting multi-tenancy later is expensive; adding billing later is cheap.
- Semantic search over stored context using a fully self-hosted, zero-cost embedding model.

## 4. Non-Goals (MVP)

- Real-time collaborative editing UI (React Flow graph, live cursors) — Phase 3.
- Git/PR/issue-tracker auto-sync — Phase 3.
- Billing/payments integration — plumbing only (plan field on the account), no actual Stripe integration yet.
- Fine-grained team permissions (roles, RBAC) — single owner + API keys is enough for MVP.
- On-prem/self-hosted customer deployments.

## 5. Target Users

1. **Primary (MVP):** Individual developers or small teams using 2+ AI coding tools who are tired of re-explaining project context.
2. **Secondary (post-MVP):** Small teams (3–10 devs) wanting shared team memory across their AI tools.

## 6. Why This Matters / Differentiator

The core differentiator isn't "yet another docs tool" — it's that **agents write back**, not just read. An agent that ships a feature updates the project's memory itself, so the next agent (any agent, any device) inherits that knowledge without a human re-typing it into a README. Longer term, storing context as a knowledge graph (Feature → API → Service → Decision) lets an agent answer "what breaks if I change X" — reasoning over project structure, not just searching text.

---

## 7. Free-Tier Architecture (MVP)

```
                    ┌───────────────────────────┐
                    │   Next.js Dashboard        │  → Vercel Hobby (free, no sleep)
                    │  (project view, API keys)  │
                    └─────────────┬───────────────┘
                                  │ HTTPS
                    ┌─────────────▼───────────────┐
                    │   FastAPI Backend            │  → Render free web service
                    │   - REST API                 │     (750 hrs/mo, sleeps after
                    │   - MCP Server (stdio/SSE)   │      15 min idle, ~1 min cold start)
                    │   - Local embedding model    │
                    │     (sentence-transformers,  │
                    │      CPU, runs in-process)   │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │  Supabase (Postgres+pgvector)│  → free tier
                    │  - projects, context, docs   │     (500MB, 2 active projects,
                    │  - decisions, tasks, sessions│      pauses after 7 days idle)
                    │  - embeddings (pgvector)     │
                    │  - Realtime (change feed)    │
                    └───────────────────────────────┘

      Claude Code · Cursor · Windsurf · Codex CLI  ──MCP──┐
      Gemini CLI · ChatGPT (Actions) · plain HTTP  ──REST─┴──► FastAPI Backend
```

**Why this stack:**
- **Supabase free tier** gives Postgres + pgvector + a realtime change feed in one place, avoiding a separate WebSocket broadcaster for MVP — cutting real infra work in half. The free tier allows up to 200 peak concurrent connections and 2 million messages per month.
- **Render free web service** hosts both the REST API and the MCP server (MCP over SSE/streamable HTTP works fine on a normal web service). Free web services spin down after 15 minutes of inactivity and restart on the next request, with spin-up taking about one minute. Acceptable for MVP; see §11 for mitigation.
- **Local embedding model** (e.g. `all-MiniLM-L6-v2` via `sentence-transformers`, ~80MB) runs in-process on the Render free instance — zero API cost, at the price of lower embedding quality and slower cold-start than a hosted model. This is the tradeoff you chose; documented as an explicit MVP decision, not an oversight (§14 has the upgrade note).
- **Vercel Hobby** hosts the dashboard for free with no sleep, since a dashboard needs to feel instant even if the API is warming up.

**Known limitation to design around:** Supabase free projects pause after 7 days with zero traffic, and Render free services sleep after 15 minutes idle. Both are solvable with a scheduled keep-alive (§11) but you should know this going in — it's the honest cost of "$0."

---

## 8. Data Model

```
accounts        (id, email, created_at, plan)              -- plan: 'free' | 'pro' (unused in MVP, future billing hook)
api_keys        (id, account_id, project_id, key_hash, created_at, last_used_at)
projects        (id, account_id, name, created_at)
documents       (id, project_id, category, title, body, embedding vector, created_at, updated_at)
                 -- category: architecture | requirement | constraint | api | schema | coding_standard
decisions       (id, project_id, title, reason, alternatives, impact, decided_at, embedding vector)
features        (id, project_id, name, status, created_at, updated_at, deprecated_at)
                 -- status: created | modified | deprecated | removed
feature_edges   (id, feature_id, related_feature_id, relation)
                 -- relation: implements | depends_on | uses | introduced_by  (knowledge graph, Phase 3-ready schema now)
tasks           (id, project_id, title, status, created_at, updated_at)
sessions        (id, project_id, agent_name, summary, added, changed, removed, known_issues, created_at)
agent_notes     (id, project_id, agent_name, note, updated_at)  -- ephemeral per-agent scratchpad
```

All `documents` and `decisions` rows get an embedding on write (via the local model), indexed with pgvector HNSW for semantic search.

---

## 9. Functional Requirements

### 9.1 Context Read/Write (MCP + REST)
- `context.get(project_id)` — returns architecture, requirements, decisions, current tasks, open bugs.
- `context.update(project_id, category, title, description)` — agent writes a new fact.
- `context.list(project_id, category?)`
- `context.search(project_id, query)` — semantic search over documents + decisions via pgvector.

### 9.2 Decision Log
- `decision.add(project_id, title, reason, alternatives, impact)`
- `decision.search(project_id, query)` — "why did we remove Kafka?" → nearest decision by embedding.

### 9.3 Feature Timeline / Graph
- `feature.add(project_id, name)`, status transitions (created → modified → deprecated → removed).
- `feature.link(feature_id, related_feature_id, relation)` — builds the dependency graph for future "what breaks if I change X" queries. Schema ships in MVP; the reasoning layer is Phase 3.

### 9.4 Session Summaries
- `session.end(project_id, agent_name, summary)` — stores what an agent did in a session (added/changed/removed/known issues), permanently.

### 9.5 Multi-Agent Sync
- Any agent calling `context.get()` sees writes from any other agent, immediately (via Supabase Realtime feed → dashboard live-updates; MCP clients get fresh data on next call since MCP is pull-based, not push).

### 9.6 Auth & Multi-Tenancy
- Sign up with email (magic link) or GitHub OAuth → creates an `account`.
- Create a `project` → generates an API key.
- Each MCP/REST call authenticates via API key scoped to one project — this is what makes it usable as a public product without cross-tenant data leakage.

### 9.7 Agent Coverage (MVP, "as many as possible")
| Client | Integration path |
|---|---|
| Claude Code | Native MCP server config |
| Cursor | Native MCP server config |
| Windsurf | Native MCP server config |
| Codex CLI | Native MCP server config (if MCP-supported) or REST fallback |
| Gemini CLI | MCP if supported by client version, else REST fallback |
| ChatGPT | Custom GPT Action calling the REST API (MCP support varies by plan) |
| Anything else | Documented REST API — this is the fallback that guarantees "any agent" is true on day one, not just MCP-native ones |

---

## 10. Non-Functional Requirements

- **Cost:** $0/month infra at MVP scale (see §7).
- **Latency:** MCP `context.get()` should return in <2s on a warm instance; cold start (post-sleep) up to ~60s is acceptable for MVP and should be communicated in the dashboard, not hidden.
- **Data isolation:** Every query scoped by `project_id` derived from the API key — no cross-tenant reads, ever, since this is a public product.
- **Portability:** No vendor lock-in beyond standard Postgres/pgvector — self-hostable later if you outgrow Supabase.

---

## 11. Mitigating Free-Tier Limits (since this is public-facing)

- **Render sleep (15 min idle):** Add a free external cron ping (e.g. GitHub Actions scheduled workflow, or cron-job.org) every 10 minutes to `/health`. This keeps the service warm during active hours without paying — but burns into the 750 free hours/month, so budget it (750 hrs ≈ 31 days of 24/7 uptime, so a single always-on service just barely fits; a ping strategy targeting business hours only is safer).
- **Supabase 7-day pause:** Same cron hits a lightweight `/health` DB query to keep the project active.
- **2-project cap on Supabase:** Use one Supabase project for the MVP (dev+prod share it initially); this is a real constraint to revisit before real users show up — flag it as the first upgrade trigger (§14).
- **Embedding quality:** Self-hosted MiniLM is noticeably weaker than OpenAI/Anthropic embeddings on nuanced semantic search. Acceptable for MVP; flag as upgrade path.

---

## 12. MCP API Surface (small, by design)

```
context.get(project_id)
context.search(project_id, query)
context.update(project_id, category, title, description)
context.list(project_id, category?)
context.timeline(project_id, feature_name)
decision.add(project_id, title, reason, alternatives, impact)
decision.search(project_id, query)
feature.add(project_id, name)
feature.link(feature_id, related_feature_id, relation)
session.end(project_id, agent_name, summary)
project.summary(project_id)
```

---

## 13. Roadmap

**Phase 1 — MVP (2–4 weeks, solo)**
- FastAPI backend, MCP server, REST fallback
- Supabase schema + pgvector, local embedding model
- Auth (GitHub OAuth or magic link), API keys, project creation
- Dashboard: view context, decisions, sessions, manage API keys
- Ship to Claude Code, Cursor, Windsurf via MCP; REST documented for everything else

**Phase 2**
- Feature graph reasoning ("what breaks if I change X")
- Team accounts (invite teammates to a project)
- Upgrade Supabase/Render off free tier once real usage requires it
- Swap local embeddings for a hosted model behind a feature flag (quality upgrade, opt-in cost)

**Phase 3**
- Git/PR auto-sync, Jira/Linear/GitHub Issues sync
- Knowledge graph visualization (React Flow)
- Conflict detection when agents contradict prior decisions
- Billing integration (Stripe) — the `plan` field and API-key-per-project structure from MVP make this a plug-in, not a rebuild

---

## 14. Upgrade Triggers (when to stop being free)

- More than ~2 active projects needed → Supabase Pro ($25/mo)
- Consistent traffic makes Render's 15-min sleep annoying to real users → Render Starter ($7/mo, no sleep)
- Embedding search quality complaints → swap to hosted embeddings (usage-based, pennies per project)
- These are the three costs to watch; everything else in this architecture scales gracefully.

---

## 15. Success Metrics (MVP)

- # of projects created
- # of MCP calls/day (proxy for "agents actually use this mid-session," not just sign-up-and-abandon)
- # of decisions/context entries written by agents (not just read) — this is the real signal the write-back loop works
- Retention: projects with ≥1 write in the last 7 days

---

## 16. Open Questions

- Which OAuth provider(s) beyond GitHub, if any, for sign-up?
- Should `agent_notes` (ephemeral scratchpad) be visible in the dashboard, or purely internal?
- Do you want the REST fallback documented publicly on day one, or held back until MCP coverage is proven?
