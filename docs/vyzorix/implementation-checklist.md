# Vyzorix — Path C Implementation Checklist
## OpenHands Base + Vinns Mobile UI & Design Hybrid

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Render (Docker)                    │
│                                                      │
│  ┌──────────────┐     ┌────────────────────────┐    │
│  │ React Frontend│     │  FastAPI Backend        │    │
│  │ (Vite build)  │────▶│  (uvicorn, port 3000)  │    │
│  │ Vyzorix UI    │     │  Agent loop, LiteLLM    │    │
│  └──────────────┘     └────────┬───────────────┘    │
│                                 │                    │
└─────────────────────────────────┼────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌────────────┐
              │ Daytona  │ │ Supabase │ │ User's LLM │
              │ Sandbox  │ │ Postgres │ │ API Key     │
              │ API      │ │ (free)   │ │ (Gemini,   │
              │ (free)   │ │          │ │  Ollama..) │
              └──────────┘ └──────────┘ └────────────┘
```

---

## Phase 0: Fork & Setup (Day 1)
*Get the project building locally before changing anything.*

- [ ] **0.1** Fork OpenHands to your GitHub (already done: `VinnsEdesigner/OpenHands`)
- [ ] **0.2** Clone fresh: `git clone https://github.com/VinnsEdesigner/OpenHands.git vyzorix`
- [ ] **0.3** Install Python 3.12+ and Poetry
- [ ] **0.4** Install Node.js 22+ 
- [ ] **0.5** Run `make build` — verify it completes (installs Python deps, frontend deps, builds frontend)
- [ ] **0.6** Create `config.toml` with a free model:
  ```toml
  [core]
  workspace_base="./workspace"
  
  [llm]
  model="gemini/gemini-1.5-pro"
  api_key="YOUR_GEMINI_KEY"
  ```
- [ ] **0.7** Run `make run` — verify the app starts on `http://localhost:3000`
- [ ] **0.8** Create a branch: `git checkout -b vyzorix/initial-customization`

---

## Phase 1: Branding & Cleanup (Days 2-3)
*Strip OpenHands branding, add Vyzorix identity. No functional changes.*

### 1A: Frontend Branding
| # | File(s) | What to Change |
|---|---------|---------------|
| 1.1 | `frontend/src/root.tsx` | Change `title: "OpenHands"` → `"Vyzorix"`, update description |
| 1.2 | `frontend/src/assets/branding/openhands-logo.svg` | Replace with Vyzorix logo |
| 1.3 | `frontend/src/assets/branding/openhands-logo-white.svg` | Replace with Vyzorix white logo |
| 1.4 | `frontend/src/i18n/translation.json` | Find-replace "OpenHands" → "Vyzorix" in all strings |
| 1.5 | `frontend/index.html` (if exists) or `frontend/public/` | Update favicon, meta tags, OG image |
| 1.6 | `frontend/src/tailwind.css` + `frontend/src/index.css` | Adjust brand colors (Vinns uses orange accent on dark bg) |
| 1.7 | Search all `frontend/src/` for hardcoded "OpenHands" strings | Replace with "Vyzorix" |

### 1B: Backend Branding
| # | File(s) | What to Change |
|---|---------|---------------|
| 1.8 | `openhands/app_server/app.py` | Change `title='OpenHands'` → `'Vyzorix'`, update description |
| 1.9 | `openhands/app_server/version.py` | Update version string if needed |

### 1C: Repo Cleanup
| # | File(s) | Action |
|---|---------|--------|
| 1.10 | `README.md` | Rewrite for Vyzorix |
| 1.11 | `CREDITS.md`, `COMMUNITY.md`, `CITATION.cff` | Delete |
| 1.12 | `CODE_OF_CONDUCT.md`, `CONTRIBUTING.md`, `ISSUE_TRIAGE.md`, `Development.md` | Delete or replace |
| 1.13 | `CNAME` | Update to your domain (or delete) |
| 1.14 | `pydoc-markdown.yml` | Delete (docs generator config) |
| 1.15 | `.github/` | Strip issue templates, update CI workflows for your fork |

### 1D: Verify
- [ ] **1.16** `cd frontend && npm run build` — no errors
- [ ] **1.17** `make run` — app shows Vyzorix branding
- [ ] **1.18** Commit: `git commit -m "rebrand: OpenHands → Vyzorix"`

---

## Phase 2: Daytona Sandbox Integration (Days 4-8)
*The hardest and most valuable piece. Replace Docker sandbox with Daytona API.*

### 2A: Understand the Sandbox Abstraction
The key files to study:

| File | Purpose |
|------|---------|
| `openhands/app_server/sandbox/sandbox_service.py` | **Abstract base class** — `SandboxService` with methods: `start_sandbox`, `get_sandbox`, `pause_sandbox`, `delete_sandbox`, `search_sandboxes` |
| `openhands/app_server/sandbox/sandbox_models.py` | Data models: `SandboxInfo`, `SandboxStatus`, `SandboxPage`, `ExposedUrl` |
| `openhands/app_server/sandbox/docker_sandbox_service.py` | Docker implementation (reference) |
| `openhands/app_server/sandbox/remote_sandbox_service.py` | Remote HTTP implementation (closest to what you need) |
| `openhands/app_server/sandbox/sandbox_router.py` | API routes that call the service |
| `openhands/app_server/config.py` | Where sandbox service is injected (line ~331-385) |

### 2B: Create Daytona Sandbox Service

| # | Task | Details |
|---|------|---------|
| 2.1 | Create `openhands/app_server/sandbox/daytona_sandbox_service.py` | New file implementing `SandboxService` abstract class |
| 2.2 | Implement `start_sandbox()` | Call Daytona API `POST /workspaces` to create a workspace |
| 2.3 | Implement `get_sandbox()` | Call Daytona API `GET /workspaces/{id}` |
| 2.4 | Implement `search_sandboxes()` | Call Daytona API `GET /workspaces` |
| 2.5 | Implement `pause_sandbox()` | Call Daytona API to stop workspace |
| 2.6 | Implement `delete_sandbox()` | Call Daytona API to delete workspace |
| 2.7 | Implement `resume_sandbox()` | Call Daytona API to restart workspace |
| 2.8 | Create `openhands/app_server/sandbox/daytona_sandbox_spec_service.py` | Implement `SandboxSpecService` for Daytona |

### 2C: Wire Daytona into Config

| # | File | Change |
|---|------|--------|
| 2.9 | `openhands/app_server/config.py` | Add `DaytonaSandboxServiceInjector` import and add `elif os.getenv('RUNTIME') == 'daytona':` branch (~line 331) |
| 2.10 | `config.template.toml` | Add Daytona config example |

### 2D: Environment Variables Needed
```
RUNTIME=daytona
DAYTONA_API_KEY=your_key
DAYTONA_API_URL=https://api.daytona.io/v1
```

### 2E: Daytona SDK Methods to Map

| OpenHands Method | Daytona SDK Equivalent |
|-----------------|----------------------|
| `start_sandbox()` | `daytona.create(CreateWorkspaceParams)` |
| `get_sandbox(id)` | `daytona.get_workspace(workspace_id)` |
| `pause_sandbox(id)` | `daytona.stop(workspace)` |
| `delete_sandbox(id)` | `daytona.delete(workspace)` |
| `resume_sandbox(id)` | `daytona.start(workspace)` |
| Execute command | `workspace.process.exec(cmd)` |
| Read file | `workspace.fs.read(path)` |
| Write file | `workspace.fs.write(path, content)` |

### 2F: Agent Server Consideration
**Important:** OpenHands runs an "agent server" *inside* each sandbox container. This is a separate FastAPI app (`openhands/agent_server/`) that handles the actual agent loop, tool execution, etc. The main app server communicates with it via HTTP.

For Daytona, you have two options:
1. **Build a custom Daytona image** that includes the agent server (recommended — matches OpenHands architecture)
2. **Skip the agent server** and have the main app server execute commands directly via Daytona SDK (simpler but breaks some features)

| # | Task |
|---|------|
| 2.11 | Decide on agent server approach |
| 2.12 | If option 1: Create a Docker image with agent server, push to registry, use as Daytona base image |
| 2.13 | If option 2: Modify command execution to use Daytona SDK directly |

### 2G: Verify
- [ ] **2.14** Start app with `RUNTIME=daytona` — sandbox creates via Daytona API
- [ ] **2.15** Execute a bash command in the sandbox — output streams back
- [ ] **2.16** File read/write works through the sandbox
- [ ] **2.17** Sandbox cleanup works (pause/delete)
- [ ] **2.18** Commit: `git commit -m "feat: Daytona sandbox integration"`

---

## Phase 3: Database & Auth (Days 9-11)
*Set up Supabase PostgreSQL and optionally port Firebase Auth.*

### 3A: Supabase PostgreSQL

| # | Task | Details |
|---|------|---------|
| 3.1 | Create Supabase project (free tier) | Get connection string |
| 3.2 | Set env vars | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` |
| 3.3 | Run app — Alembic auto-creates tables | OpenHands uses `openhands/app_server/app_lifespan/alembic/` for migrations |
| 3.4 | Verify conversations persist across restarts | |

### 3B: Authentication (Choose ONE)

**Option A: Keep OpenHands' default auth (simplest)**
- OpenHands has a built-in JWT-based auth system
- Works out of the box with no changes
- Users get a simple login page

**Option B: Add Firebase Auth (port from Vinns)**

| # | Task | Details |
|---|------|---------|
| 3.5 | Add `firebase-admin` to `pyproject.toml` | Python Firebase SDK |
| 3.6 | Create `openhands/app_server/user_auth/firebase_user_auth.py` | Implement `UserAuth` abstract class using Firebase tokens |
| 3.7 | Port Vinns' `components/auth-screen.tsx` → OpenHands frontend | Login/signup UI |
| 3.8 | Port Vinns' `components/auth-provider.tsx` | Firebase auth context |
| 3.9 | Set `OH_USER_AUTH_CLASS=openhands.app_server.user_auth.firebase_user_auth.FirebaseUserAuth` | Config env var |
| 3.10 | Set `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` env vars | |

### 3C: Verify
- [ ] **3.11** App connects to Supabase, tables created
- [ ] **3.12** User can sign up / log in
- [ ] **3.13** Conversations persist across sessions
- [ ] **3.14** Commit: `git commit -m "feat: Supabase DB + auth setup"`

---

## Phase 4: LLM Configuration (Days 12-13)
*Make user-provided API keys the default experience.*

| # | File | Change |
|---|------|--------|
| 4.1 | `openhands/app_server/utils/llm.py` | Change `DEFAULT_OPENHANDS_MODEL` from `openhands/claude-opus-4-5-*` to `gemini/gemini-1.5-pro` |
| 4.2 | `openhands/app_server/utils/llm.py` | Remove `OPENHANDS_MODELS` list (or replace with your curated free-tier models) |
| 4.3 | `openhands/app_server/utils/llm.py` | Remove `CLARIFAI_MODELS` (not needed) |
| 4.4 | Frontend settings route `frontend/src/routes/llm-settings.tsx` | Make API key input more prominent, add helper text like "Enter your own Gemini/OpenAI key" |
| 4.5 | Frontend settings | Add preset buttons for popular free models: `gemini/gemini-1.5-flash`, `ollama/llama3`, `groq/llama-3.1-70b` |
| 4.6 | `openhands/app_server/config.py` | Remove the `openhands/` managed proxy logic (lines ~129-170) — you won't run a proxy |
| 4.7 | Remove billing-related routes | `frontend/src/routes/billing.tsx` — remove or replace with a "Vyzorix Pro" placeholder |

### Verify
- [ ] **4.8** Default model is Gemini (free)
- [ ] **4.9** User can switch to any LiteLLM-supported model by entering API key
- [ ] **4.10** Ollama works when pointed to a local instance
- [ ] **4.11** Commit: `git commit -m "feat: user-provided LLM keys as default"`

---

## Phase 5: Mobile-First UI (Days 14-18)
*Port Vinns' mobile-first design patterns into OpenHands' React frontend.*

### 5A: Layout & Navigation (Port from Vinns)

| # | Vinns Source | OpenHands Target | What to Port |
|---|-------------|-----------------|-------------|
| 5.1 | `components/navbar.tsx` | Restyle existing header | Mobile-friendly top bar with Vyzorix branding |
| 5.2 | `components/sidebar.tsx` + `components/sidebar/` | Restyle existing sidebar | Collapsible sidebar, mobile sheet overlay |
| 5.3 | `components/top-tabs.tsx` / `components/tab-rail.tsx` | Add bottom tab navigation | Mobile tab bar for Terminal/Pulse/Settings |
| 5.4 | `app/dashboard/page.tsx` pattern | Restyle conversation view | Tab-based viewport switching |

### 5B: Component Porting

| # | Vinns Component | What It Does | Priority |
|---|----------------|-------------|----------|
| 5.5 | `components/terminal/terminal-message.tsx` | Chat bubbles (AgentBubble, UserBubble, CollapsibleAction) | **High** — replaces OpenHands' message rendering |
| 5.6 | `components/pulse-tab.tsx` + `components/pulse/` | Live agent metrics dashboard (memory, logs, progress) | **Medium** — unique Vyzorix feature |
| 5.7 | `components/hil-overlay.tsx` | Human-in-the-loop approval overlay | **Medium** — port safety UX |
| 5.8 | `components/notification-overlay.tsx` | Toast/push notifications | **Low** — add later |
| 5.9 | `components/settings-tab.tsx` + `components/settings/` | Vault, Agent, Memory, General settings | **Medium** — merge with OpenHands settings |
| 5.10 | `components/ui/nexus-spinner.tsx` | Custom loading spinner | **Low** — nice-to-have |

### 5C: Design System

| # | Task | Details |
|---|------|---------|
| 5.11 | Port Vinns' dark theme colors | Orange accent (`orange-500`), dark backgrounds (`zinc-900/950`), card styles |
| 5.12 | Add Framer Motion | `npm install motion` in frontend — for Vinns' animations |
| 5.13 | Mobile breakpoints | Ensure all views work at 375px width (iPhone SE) |
| 5.14 | Touch-friendly targets | Min 44px touch targets for all interactive elements |

### 5D: State Management

| # | Task | Details |
|---|------|---------|
| 5.15 | Port key Zustand stores from Vinns | `use-ui-store.ts` (tab management), `use-notification-store.ts` |
| 5.16 | Integrate with OpenHands' existing stores | OpenHands already uses Zustand — merge, don't duplicate |

### Verify
- [ ] **5.17** App looks like Vyzorix on mobile (375px)
- [ ] **5.18** App looks good on desktop (1440px)
- [ ] **5.19** Agent bubbles render with Vinns' design
- [ ] **5.20** Tab navigation works on mobile
- [ ] **5.21** Commit: `git commit -m "feat: Vyzorix mobile-first UI"`

---

## Phase 6: Render Deployment (Days 19-20)
*Deploy to Render as a Docker Web Service.*

### 6A: Dockerfile Adjustments

| # | File | Change |
|---|------|--------|
| 6.1 | `containers/app/Dockerfile` | Remove Docker socket mount requirement |
| 6.2 | `containers/app/Dockerfile` | Add `ENV RUNTIME=daytona` as default |
| 6.3 | `containers/app/Dockerfile` | Ensure `SERVE_FRONTEND=true` |
| 6.4 | `containers/app/entrypoint.sh` | Simplify — remove Docker socket checks (not needed with Daytona) |

### 6B: Render Config

| # | Task | Details |
|---|------|---------|
| 6.5 | Create Render Web Service | Docker, point to your fork |
| 6.6 | Set env vars on Render: | |

```env
# Sandbox
RUNTIME=daytona
DAYTONA_API_KEY=xxx
DAYTONA_API_URL=https://api.daytona.io/v1

# Database
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASS=xxx

# LLM (default — users override in settings)
LLM_MODEL=gemini/gemini-1.5-pro

# App
SERVE_FRONTEND=true
WEB_HOST=vyzorix.onrender.com

# Auth (if using Firebase)
FIREBASE_PROJECT_ID=xxx
FIREBASE_API_KEY=xxx
```

| 6.7 | Add Render persistent disk | Mount at `/.openhands` for file store |
| 6.8 | Set health check | Path: `/api/v1/health` |

### 6C: Verify
- [ ] **6.9** App deploys and loads on Render URL
- [ ] **6.10** Can create a conversation
- [ ] **6.11** Sandbox spins up via Daytona
- [ ] **6.12** Agent executes commands and returns results
- [ ] **6.13** Share URL — others can sign up and test

---

## Phase 7: Polish & Unique Features (Days 21+)
*Add Vyzorix-specific features that differentiate from OpenHands.*

| # | Feature | Source | Priority |
|---|---------|--------|----------|
| 7.1 | **Pulse Dashboard** — live agent metrics (memory usage, step count, model, token cost) | Port from Vinns `components/pulse/` | High |
| 7.2 | **Memory Synthesis** — post-session memory summarization | Port from Vinns `lib/agent/memory-summarizer.ts` (rewrite in Python) | Medium |
| 7.3 | **Multi-Persona Prompts** — Supervisor/Coder/QA dynamic switching | Port from Vinns `agent/prompts/system-baseline.ts` | Medium |
| 7.4 | **Security Sentinel** — real-time command validation UI | Port from Vinns `components/security-sentinel.tsx` | Low |
| 7.5 | **Warmpool** — pre-provisioned Daytona sandboxes for faster cold starts | Port concept from Vinns `agent/sandbox/warmpool.ts` | Low |
| 7.6 | **Artifact Viewer** — in-browser preview of generated websites/apps | Port from Vinns `app/artifacts/` | Low |
| 7.7 | **Snippets Manager** — save/reuse code snippets across sessions | Port from Vinns `components/snippets-tab.tsx` | Low |

---

## Files You Will NOT Touch
*These are core OpenHands engine files — leave them alone.*

- `openhands/agent_server/` — The agent server that runs inside sandboxes
- `openhands/sdk/` — The Software Agent SDK
- `tests/` — Keep for regression testing
- `openhands/app_server/integrations/` — GitHub/GitLab/Bitbucket integrations (useful!)
- `openhands/app_server/mcp/` — MCP support (useful!)
- `openhands/app_server/event/` — Event storage system
- `openhands/app_server/app_conversation/` — Conversation management

---

## Summary: Total Files to Create/Modify

| Phase | New Files | Modified Files | Estimated Effort |
|-------|-----------|---------------|-----------------|
| Phase 0: Setup | 0 | 1 (config.toml) | 1 day |
| Phase 1: Branding | 0 | ~15 files | 2 days |
| Phase 2: Daytona | 2-3 new files | ~3 files | 5 days |
| Phase 3: Database | 0-2 new files | ~2 files | 3 days |
| Phase 4: LLM Config | 0 | ~5 files | 2 days |
| Phase 5: Mobile UI | ~5 new components | ~10 files | 5 days |
| Phase 6: Deploy | 0 | ~3 files | 2 days |
| Phase 7: Polish | ~5 new files | ~5 files | Ongoing |
| **Total** | **~15 new** | **~44 modified** | **~20 days** |

---

## Quick-Start Priority Order
If you want to get a working Vyzorix ASAP, do this subset:

1. **Phase 0** — Get it building (1 day)
2. **Phase 1** — Rebrand to Vyzorix (1 day — just find-replace + logo swap)
3. **Phase 4** — Set Gemini as default model (30 min)
4. **Phase 6** — Deploy to Render with `RUNTIME=process` (skips Daytona, uses local process sandbox — limited but works for demo)
5. **Phase 2** — Add Daytona when ready for real sandbox execution

This gives you a branded, deployed Vyzorix in ~3 days that users can test with their own API keys. Daytona integration and mobile UI come after.

---

*Checklist created May 2026. Based on OpenHands commit `0c2e3dc0e` and Vinns repo analysis.*
