# Enterprise Knowledge Workspace

A secure enterprise AI application inspired by NotebookLM — upload, organize, analyze, and chat with your company's documents using Claude AI.

---

## Quick Start

```bash
# 1. Run setup (creates venv, installs deps, copies .env)
./setup.sh

# 2. Add your Anthropic API key
echo "ANTHROPIC_API_KEY=sk-ant-..." >> backend/.env

# 3. Start both servers
./run_dev.sh

# 4. Open http://localhost:5173
# Login: admin@company.com / changeme123
```

---

## What It Does

| Feature | Description |
|---------|-------------|
| **Workspace Management** | Create projects to group related documents |
| **Document Ingestion** | Upload PDF, DOCX, PPTX, XLSX, TXT, CSV |
| **RAG Chat** | Ask questions, get answers with source citations |
| **Report Generation** | 6 report types: Executive Summary, Action Items, Risk Analysis, Meeting Prep, FAQ, Technical Deep Dive |
| **Prompt Caching** | Claude prompt caching reduces costs on repeated queries to same workspace |
| **Auto-summaries** | Each document gets an AI-generated summary on upload |

---

## Stack

**Backend**
- `FastAPI` — async Python API
- `SQLAlchemy` + SQLite (→ PostgreSQL in production)
- `ChromaDB` — local vector store with `all-MiniLM-L6-v2` embeddings
- `Anthropic SDK` — Claude Sonnet 4.6 for RAG + generation
- `pdfplumber`, `python-docx`, `python-pptx`, `openpyxl` — document parsing
- `JWT` auth with bcrypt

**Frontend**
- `React 18` + `TypeScript` + `Vite`
- `Tailwind CSS` + `@tailwindcss/typography`
- `TanStack Query` — server state management
- `Zustand` — auth state
- `react-markdown` + `remark-gfm` — AI response rendering
- `react-dropzone` — file upload

---

## Project Structure (Modular Monolith)

```
backend/app/
├── modules/
│   ├── auth/          ← User authentication (JWT, bcrypt)
│   ├── workspaces/    ← Workspace CRUD
│   ├── documents/     ← Upload, ingestion, vector storage
│   └── knowledge/     ← RAG chat + report generation
├── core/
│   ├── config.py      ← Pydantic settings from .env
│   ├── database.py    ← SQLAlchemy engine + session
│   ├── security.py    ← JWT + password hashing
│   └── dependencies.py ← FastAPI DI (get_current_user)
└── main.py            ← FastAPI app + router registration
```

Each `modules/` subdirectory is a **self-contained domain module** — its own models, schemas, router, and service. This is the key to the scalability path below.

---

## Architecture Evolution Path

### Hybrid Strategy: Modular Monolith → Enterprise Microservices

> **Rule:** Don't split until you have a concrete reason — performance bottleneck, team scaling, or independent deployment need. Premature microservices add complexity without benefit.

---

### Phase 1 — Modular Cloud-Native Monolith (Now)

**What you have:** Single deployable Python process. All modules share one database and one process.

```
[React SPA]
     │
     │ HTTP
     ▼
[FastAPI Monolith — single process]
  ├── auth module
  ├── workspaces module
  ├── documents module  ← heavy I/O (file parsing, embedding)
  └── knowledge module  ← heavy compute (LLM calls)
     │
     ├── SQLite/PostgreSQL
     └── ChromaDB (embedded)
```

**When to use:** Teams up to ~8 engineers. < 1000 daily active users. Deployment cost < $500/month.

**Cloud deployment (monolith):**
```bash
# Single container, deployable to any cloud
docker build -t knowledge-workspace .
# Railway, Render, Fly.io, AWS ECS — all work with one command
```

---

### Phase 2 — Extract the AI Pipeline (First Split)

**Why:** Document processing and LLM calls are CPU/memory/time intensive. They block API threads and benefit from independent scaling.

**What changes:** Extract `documents/ingestion` + `knowledge/ai_service` into an async worker. The monolith enqueues jobs; the worker processes them.

```
[React SPA]
     │
     ▼
[FastAPI API Server]  ←──────── still a monolith for auth/workspaces/chat
     │
     │ enqueue job
     ▼
[Redis / SQS Queue]
     │
     ▼
[Document Processing Worker]  ← NEW separate process/container
  ├── PDF/DOCX parsing
  ├── Chunking
  ├── Embedding generation
  └── ChromaDB writes
```

**Code change:** Replace `background_tasks.add_task(...)` in `documents/router.py` with a queue publish. The worker is the same Python code, just run separately.

```python
# Before (Phase 1):
background_tasks.add_task(_process_document, ...)

# After (Phase 2):
await redis_queue.enqueue("process_document", {
    "doc_id": doc.id, "file_path": ..., "workspace_id": ...
})
```

**Result:** API stays fast. Worker scales independently. Can add GPU instances just for AI.

---

### Phase 3 — Selective Microservices (Service Extraction)

**Why:** Different modules have different scaling profiles, team ownership, or SLA requirements.

```
[React SPA]
     │
     ▼
[API Gateway — Kong / AWS API Gateway / Nginx]
     │
     ├──► [Auth Service]           ← stateless, tiny, scales to zero
     │       └── SSO: Azure AD / Okta (SAML, OIDC)
     │
     ├──► [Workspace Service]      ← CRUD, lightweight
     │
     ├──► [Document Service]       ← file storage, ingestion queue
     │       └── S3 / Azure Blob for file storage
     │
     └──► [AI/Knowledge Service]   ← GPU-enabled, expensive, auto-scales
             ├── RAG engine
             ├── Report generation
             └── Model router (Claude / GPT / local Llama)

[Shared Infrastructure]
  ├── PostgreSQL (each service has its own schema or DB)
  ├── Redis (caching + queues)
  └── Qdrant / Weaviate (production vector DB, replaces ChromaDB)
```

**How to extract each service (Strangler Fig pattern):**
1. Create new service repo from the module code
2. Add HTTP client in monolith pointing at new service
3. Gradually route traffic: monolith → new service
4. Remove module from monolith when stable

**Example: Extracting Auth to standalone service:**
```python
# core/dependencies.py — before:
user = db.query(User).filter(User.id == user_id).first()

# core/dependencies.py — after:
user = await auth_service_client.get_user(user_id)  # HTTP call to Auth Service
```

---

### Phase 4 — Full Enterprise Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE DEPLOYMENT                       │
├─────────────────────────────────────────────────────────────────────┤
│  [CDN] → [Load Balancer] → [API Gateway w/ Rate Limiting + WAF]    │
│                                     │                               │
│              ┌──────────────────────┼──────────────────────────┐   │
│              ▼                      ▼                           ▼   │
│     [Auth Service]        [Workspace+Doc Service]    [AI Service]   │
│     Azure AD / Okta       PostgreSQL per service     GPU cluster    │
│     RBAC + audit log      S3 for documents           Model router   │
│                                     │                               │
│              [Kafka / EventBridge — event bus]                      │
│                                     │                               │
│     [Notification Service]   [Analytics Service]   [Search Service] │
│     Email/Slack/Teams        Usage metrics          Full-text search │
└─────────────────────────────────────────────────────────────────────┘
```

**Infrastructure:**
- **Kubernetes** (EKS/AKS/GKE) — container orchestration
- **Istio** — service mesh, mTLS between services
- **Vault** — secrets management
- **Prometheus + Grafana** — observability
- **OpenTelemetry** — distributed tracing
- **Terraform** — infrastructure as code

---

### Decision Matrix: When to Split

| Signal | Action |
|--------|--------|
| Document processing > 30s and blocking API | Extract worker queue (Phase 2) |
| AI costs > $2k/month | Add model caching + batch processing |
| Teams > 10 engineers fighting on same codebase | Split by domain (Phase 3) |
| Need to deploy AI service on GPU, rest on CPU | Extract AI Service (Phase 3) |
| Compliance requires auth data isolated | Extract Auth Service (Phase 3) |
| > 10k daily users or > 1M documents | Full microservices (Phase 4) |
| Teams in different time zones owning different services | Full microservices (Phase 4) |

---

### Two Biggest Mistakes to Avoid

**❌ Mistake 1: Microservices too early**
- Distributed systems are hard: network failures, eventual consistency, distributed transactions
- A monolith serving 100k users/day is totally fine
- Netflix didn't start with 1000 microservices

**❌ Mistake 2: Rigid prototype that can't evolve**
- The module boundaries in this codebase ARE the future service boundaries
- Each module's `service.py` has a clean interface — that becomes the service API
- Never let modules reach into each other's database tables directly

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | **Yes** | Claude API key (`sk-ant-...`) |
| `SECRET_KEY` | Yes (prod) | Random 256-bit hex string for JWT signing |
| `DATABASE_URL` | No | Default: `sqlite:///./notebook.db`. Use `postgresql://...` in prod |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `ADMIN_EMAIL` | No | Default admin account email |
| `ADMIN_PASSWORD` | No | Default admin account password |

---

## API Reference

Interactive docs at `http://localhost:8000/api/docs` (Swagger UI).

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login, returns JWT |
| `/api/auth/register` | POST | Register new user |
| `/api/auth/me` | GET | Current user profile |
| `/api/workspaces` | GET/POST | List / create workspaces |
| `/api/workspaces/{id}` | GET/PUT/DELETE | Workspace operations |
| `/api/workspaces/{id}/documents` | GET/POST | List / upload documents |
| `/api/workspaces/{id}/documents/{doc_id}` | DELETE | Delete document |
| `/api/workspaces/{id}/chat` | POST | Send chat message (RAG) |
| `/api/workspaces/{id}/conversations` | GET | List conversations |
| `/api/workspaces/{id}/reports` | POST | Generate report |
| `/api/health` | GET | Health check |

---

## Security Notes (Production Checklist)

- [ ] Change `SECRET_KEY` to a random 256-bit value
- [ ] Change default admin credentials
- [ ] Use PostgreSQL instead of SQLite
- [ ] Set `DEBUG=false`
- [ ] Restrict `ALLOWED_ORIGINS` to your domain
- [ ] Enable HTTPS (TLS termination at load balancer)
- [ ] Add rate limiting (API Gateway or FastAPI middleware)
- [ ] Set up audit logging (log all document access + AI queries)
- [ ] Configure data retention policies
- [ ] Add SSO (Azure AD / Okta) via SAML/OIDC — replace `auth/service.py`
- [ ] Encrypt document storage at rest (S3 SSE / Azure Blob encryption)
- [ ] Regular dependency vulnerability scans (`pip audit`, `npm audit`)
