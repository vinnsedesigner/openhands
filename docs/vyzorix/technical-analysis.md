# Vyzorix: OpenHands + Daytona Integration — Technical Analysis

## Executive Summary

Building Vyzorix by forking OpenHands and replacing its Docker sandbox with Daytona's API is **technically feasible** but requires significant integration work. OpenHands has a well-designed pluggable sandbox abstraction (`SandboxService`) that already supports Docker, Remote, and Process backends. Daytona provides a rich Python SDK with sandbox lifecycle management, process execution, file I/O, terminal/PTY access, and even computer-use (VNC). The main challenge is **architectural mismatch**: OpenHands sandboxes run an internal "agent server" process inside the container, while Daytona sandboxes are general-purpose compute environments.

**Key finding:** You're not just swapping a container runtime — you need to run OpenHands' agent server *inside* Daytona sandboxes, then wire the app server to talk to it there.

---

## Part 1: OpenHands Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│   React 19 + Vite + TailwindCSS + TanStack Query    │
│   Routes: home, conversation, settings, login, etc.  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP/WebSocket
┌──────────────────────▼──────────────────────────────┐
│              App Server (FastAPI)                     │
│  /openhands/app_server/                              │
│  ├── sandbox/        → Sandbox lifecycle management  │
│  ├── app_conversation/ → Conversation management     │
│  ├── config.py       → DI configuration              │
│  ├── settings/       → User/org settings             │
│  ├── event/          → Event streaming               │
│  ├── secrets/        → Secret management             │
│  └── user/           → Auth & user context           │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (proxied)
┌──────────────────────▼──────────────────────────────┐
│           Agent Server (per-sandbox)                 │
│  Runs INSIDE each sandbox container                  │
│  Handles: LLM calls, tool execution, event loop      │
│  Exposes: /alive, WebSocket, REST API                │
│  Port: 60000 (agent), 60001 (VSCode), 12000-12001   │
└─────────────────────────────────────────────────────┘
```

### 1.2 Sandbox System — The Core Abstraction

**File:** `/openhands/app_server/sandbox/sandbox_service.py` (234 lines)

The `SandboxService` is the abstract base class all sandbox backends must implement:

```python
class SandboxService(ABC):
    async def search_sandboxes(page_id, limit) -> SandboxPage
    async def get_sandbox(sandbox_id) -> SandboxInfo | None
    async def get_sandbox_by_session_api_key(key) -> SandboxInfo | None
    async def start_sandbox(sandbox_spec_id, sandbox_id) -> SandboxInfo
    async def resume_sandbox(sandbox_id) -> bool
    async def pause_sandbox(sandbox_id) -> bool
    async def delete_sandbox(sandbox_id) -> bool
    # Built-in helpers (not abstract):
    async def wait_for_sandbox_running(sandbox_id, timeout, poll_interval)
    async def pause_old_sandboxes(max_num_sandboxes)
```

**Data Models** (`sandbox_models.py`):

```python
class SandboxStatus(Enum):
    STARTING = 'STARTING'
    RUNNING = 'RUNNING'
    PAUSED = 'PAUSED'
    ERROR = 'ERROR'
    MISSING = 'MISSING'

class SandboxInfo(BaseModel):
    id: str
    created_by_user_id: str | None
    sandbox_spec_id: str          # Docker image tag or spec identifier
    status: SandboxStatus
    session_api_key: str | None   # Auth key for agent server
    exposed_urls: list[ExposedUrl] | None
    created_at: datetime

class ExposedUrl(BaseModel):
    name: str    # "AGENT_SERVER", "VSCODE", "WORKER_1", "WORKER_2"
    url: str
    port: int
```

### 1.3 Existing Sandbox Implementations

| Implementation | File | How It Works |
|---|---|---|
| **DockerSandboxService** | `docker_sandbox_service.py` (694 lines) | Runs containers via Docker API. Maps ports, manages volumes, health checks agent server. |
| **ProcessSandboxService** | `process_sandbox_service.py` (459 lines) | Spawns local Python processes. Uses psutil for lifecycle. Good for development. |
| **RemoteSandboxService** | `remote_sandbox_service.py` (948 lines) | Calls a remote HTTP API to manage runtimes. Uses SQLAlchemy for local state. Production-grade. |

**Key insight:** All three implementations share a pattern:
1. Start a container/process that runs the **agent server**
2. Wait for `/alive` health check to pass
3. Return `SandboxInfo` with `exposed_urls` pointing to the agent server
4. The app server proxies all conversation traffic to the agent server URL

### 1.4 Configuration & Dependency Injection

**File:** `/openhands/app_server/config.py` (612 lines)

The sandbox backend is selected via environment variables:

```python
# In config_from_env():
if os.getenv('RUNTIME') == 'remote':
    config.sandbox = RemoteSandboxServiceInjector(...)
elif os.getenv('RUNTIME') in ('local', 'process'):
    config.sandbox = ProcessSandboxServiceInjector()
else:
    config.sandbox = DockerSandboxServiceInjector(...)
```

**Adding Daytona would mean:**
- Creating `DaytonaSandboxServiceInjector`
- Adding `elif os.getenv('RUNTIME') == 'daytona':` branch
- Or setting `config.sandbox` directly in a custom config

### 1.5 How Conversations Use Sandboxes

**File:** `app_conversation_router.py` — The `AgentServerContext` pattern:

```
1. User starts conversation → POST /app-conversations
2. App server calls sandbox_service.start_sandbox() 
3. Sandbox starts → agent server boots inside it
4. App server gets agent_server_url from sandbox.exposed_urls
5. All conversation messages proxied: App Server → Agent Server URL
6. Agent server handles LLM calls, tool use, code execution
```

The agent server is a **separate FastAPI app** that runs inside each sandbox. It's the actual AI brain — it handles the LLM conversation loop, executes tools (bash, file editing, browser), and streams events back.

### 1.6 Frontend Structure

**Tech stack:** React 19, Vite 7, TailwindCSS 4, React Router 7, TanStack Query, Zustand, i18next

**Branding touchpoints for Vyzorix rebrand:**

| What | Where |
|---|---|
| Page title | `frontend/src/root.tsx` — `{ title: "OpenHands" }` |
| Logo SVGs | `frontend/src/assets/branding/openhands-logo.svg`, `openhands-logo-white.svg` |
| Package name | `frontend/package.json` — `"name": "openhands-frontend"` |
| Header component | `frontend/src/components/features/home/home-header/` |
| Sidebar | `frontend/src/components/features/sidebar/sidebar.tsx` |
| i18n strings | `frontend/src/` — uses i18next with `make-i18n` script |
| Login page | `frontend/src/routes/login.tsx` |
| Git provider logos | `frontend/src/assets/branding/` (GitHub, GitLab, BitBucket, Azure DevOps) |

**Rebranding effort estimate:** Low-medium. Mostly find-and-replace "OpenHands" + swap SVG logos + adjust color scheme in TailwindCSS config.

### 1.7 LLM Integration

OpenHands supports multiple LLM providers via LiteLLM proxy:
- Models configured via user/org settings
- `openhands/` and `litellm_proxy/` model prefixes route through a proxy
- Default proxy: `https://llm-proxy.app.all-hands.dev/`
- Self-hosted: set `OPENHANDS_PROVIDER_BASE_URL` or `LLM_BASE_URL`

**For Vyzorix:** You'd need your own LLM proxy or direct API keys. This is the ongoing cost — Daytona only solves sandbox compute, not LLM inference.

---

## Part 2: Daytona SDK Capabilities

### 2.1 SDK Overview

**Python SDK location:** `/libs/sdk-python/src/daytona/`

The Daytona Python SDK provides both sync and async interfaces:

```python
from daytona import Daytona, DaytonaConfig

# Initialize
daytona = Daytona(DaytonaConfig(
    api_key="your-api-key",
    api_url="https://app.daytona.io/api",
    target="us"
))

# Create sandbox
sandbox = daytona.create()  # Default Python sandbox

# Execute commands
result = sandbox.process.exec("echo 'Hello World'")
print(result.artifacts.stdout)

# File operations
sandbox.fs.upload_file("local.txt", "/workspace/remote.txt")
content = sandbox.fs.download_file("/workspace/remote.txt")

# PTY/Terminal
sandbox.process.create_pty_session("my-terminal")

# Cleanup
sandbox.stop()
daytona.delete(sandbox)
```

### 2.2 Sandbox Capabilities

| Capability | Daytona Class | Key Methods |
|---|---|---|
| **Lifecycle** | `Sandbox` | `start()`, `stop()`, `delete()`, `refresh_data()`, `wait_for_sandbox_start()` |
| **Process execution** | `Process` | `exec(command, cwd, env, timeout)`, `code_run(code)`, sessions, PTY |
| **File system** | `FileSystem` | `upload_file()`, `download_file()`, `create_folder()`, `delete_file()`, `find_files()`, `search_files()`, `list_files()` |
| **Git** | `Git` | Git operations within sandbox |
| **Computer use** | `ComputerUse` | Desktop automation (VNC), screenshots, mouse/keyboard |
| **Code interpreter** | `CodeInterpreter` | Stateful Python interpreter |
| **LSP** | `LspServer` | Language server protocol support |
| **Snapshots** | `SnapshotService` | Save/restore sandbox state |

### 2.3 Sandbox States (Daytona)

```python
from daytona_api_client import SandboxState

# States: PENDING_BUILD, STARTING, STARTED, STOPPING, STOPPED, 
#         ERROR, BUILD_FAILED, DESTROYED, ARCHIVED
```

**Mapping to OpenHands:**

| OpenHands Status | Daytona State | Notes |
|---|---|---|
| `STARTING` | `PENDING_BUILD`, `STARTING` | Direct map |
| `RUNNING` | `STARTED` | Direct map |
| `PAUSED` | `STOPPED` | Daytona uses stop/start, not pause/unpause |
| `ERROR` | `ERROR`, `BUILD_FAILED` | Direct map |
| `MISSING` | `DESTROYED`, `ARCHIVED` | Sandbox no longer exists |

### 2.4 Pricing & Free Tier

From [daytona.io/pricing](https://www.daytona.io/pricing):

- **$200 in free compute included** (no credit card required)
- **Pay-as-you-go after that:**
  - vCPU: $0.0504/hour
  - Memory: $0.0162/hour per GiB
  - Storage: $0.000108/hour per GiB (first 5 GiB free)

- **Tier system** (based on verification):
  - Rate limits: 10,000-50,000 requests/min depending on tier
  - Sandbox creation: 300-600/min
  - Per-sandbox resource limits vary by tier

- **Auto-stop:** Default 15 min idle timeout (configurable, including disable)
- **Auto-archive:** Default 7 days after stopped
- **Startup program:** Up to $50k in credits for startups

**⚠️ Important:** $200 free credit sounds generous but with a running sandbox using 2 vCPU + 4 GiB RAM:
- Cost: ~$0.165/hour
- $200 ≈ 1,212 hours ≈ 50 days of continuous running
- With auto-stop at 15 min idle, this stretches much further for intermittent use

### 2.5 Authentication

```python
# API key authentication
config = DaytonaConfig(api_key="your-api-key")

# JWT authentication (alternative)
config = DaytonaConfig(
    jwt_token="your-jwt-token",
    organization_id="your-org-id"
)

# Environment variables
# DAYTONA_API_KEY, DAYTONA_API_URL, DAYTONA_TARGET
```

---

## Part 3: Integration Mapping

### 3.1 The Core Challenge

OpenHands doesn't just need a "container" — it needs a container running the **agent server**. The agent server is a FastAPI app that:
1. Receives conversation messages from the app server
2. Runs the LLM loop (calling Claude/GPT/etc.)
3. Executes tools (bash commands, file edits, browser actions)
4. Streams events back

**Two possible integration approaches:**

#### Approach A: Run Agent Server Inside Daytona Sandbox (Recommended)
```
┌─────────────┐     ┌─────────────────────────────────────┐
│  App Server  │────▶│  Daytona Sandbox                    │
│  (FastAPI)   │     │  ┌─────────────────────────────┐   │
│              │     │  │  Agent Server (port 60000)   │   │
│              │◀────│  │  - LLM loop                  │   │
│              │     │  │  - Tool execution             │   │
│              │     │  │  - Event streaming            │   │
│              │     │  └─────────────────────────────┘   │
└─────────────┘     └─────────────────────────────────────┘
```

- Use Daytona's `process.exec()` or custom image to start the agent server
- Get the sandbox's preview URL to reach the agent server
- Map Daytona sandbox lifecycle to OpenHands `SandboxService` methods

#### Approach B: Use Daytona Only for Code Execution (Major Refactor)
```
┌─────────────┐     ┌─────────────────────────────────────┐
│  App Server  │     │                                     │
│  + Agent     │────▶│  Daytona Sandbox                    │
│    Server    │     │  (just a terminal/filesystem)       │
│  (combined)  │◀────│                                     │
└─────────────┘     └─────────────────────────────────────┘
```

- Run the agent server as part of the app server
- Use Daytona SDK for `process.exec()`, `fs.upload()`, etc.
- Would require **massive** refactoring of OpenHands' architecture

**Recommendation: Approach A.** It preserves OpenHands' architecture and is much less work.

### 3.2 Method-by-Method Mapping (Approach A)

```
DaytonaSandboxService implements SandboxService
```

| OpenHands Method | Daytona SDK Equivalent | Notes |
|---|---|---|
| `start_sandbox(spec_id)` | `daytona.create(CreateSandboxFromImageParams(image=spec_id))` + start agent server via `sandbox.process.exec()` | Need to build a Docker image with agent server pre-installed, or install at boot |
| `get_sandbox(id)` | `daytona.get(id)` → map state | Convert `SandboxState` → `SandboxStatus` |
| `search_sandboxes()` | `daytona.list()` with label filtering | Filter by labels to only show Vyzorix sandboxes |
| `resume_sandbox(id)` | `sandbox.start()` | Daytona uses start/stop, not pause/resume |
| `pause_sandbox(id)` | `sandbox.stop()` | Maps to stop |
| `delete_sandbox(id)` | `daytona.delete(sandbox)` | Direct map |
| `get_sandbox_by_session_api_key()` | Custom: store key→id mapping locally or via labels | Daytona doesn't have this concept natively |
| `batch_get_sandboxes()` | Loop `daytona.get()` | Base class has default implementation |

### 3.3 Exposed URLs Mapping

OpenHands expects these from each sandbox:

| Name | Port | Purpose | Daytona Equivalent |
|---|---|---|---|
| `AGENT_SERVER` | 60000 | Agent server REST/WS | `sandbox.get_preview_link(60000)` |
| `VSCODE` | 60001 | VSCode in browser | `sandbox.get_preview_link(60001)` |
| `WORKER_1` | 12000 | User app port 1 | `sandbox.get_preview_link(12000)` |
| `WORKER_2` | 12001 | User app port 2 | `sandbox.get_preview_link(12001)` |

Daytona provides `sandbox.get_preview_link(port)` which returns a public URL for any port running inside the sandbox. This maps well.

### 3.4 Implementation Skeleton

```python
# openhands/app_server/sandbox/daytona_sandbox_service.py

from daytona import Daytona, DaytonaConfig, CreateSandboxFromImageParams
from openhands.app_server.sandbox.sandbox_service import SandboxService
from openhands.app_server.sandbox.sandbox_models import *

DAYTONA_STATE_MAP = {
    "pending_build": SandboxStatus.STARTING,
    "starting": SandboxStatus.STARTING,
    "started": SandboxStatus.RUNNING,
    "stopping": SandboxStatus.PAUSED,
    "stopped": SandboxStatus.PAUSED,
    "error": SandboxStatus.ERROR,
    "build_failed": SandboxStatus.ERROR,
    "destroyed": SandboxStatus.MISSING,
    "archived": SandboxStatus.MISSING,
}

class DaytonaSandboxService(SandboxService):
    def __init__(self, api_key: str, api_url: str, target: str, agent_image: str):
        self.daytona = Daytona(DaytonaConfig(
            api_key=api_key, api_url=api_url, target=target
        ))
        self.agent_image = agent_image  # Docker image with agent server
        self._key_map: dict[str, str] = {}  # session_api_key → sandbox_id
    
    async def start_sandbox(self, sandbox_spec_id=None, sandbox_id=None):
        image = sandbox_spec_id or self.agent_image
        sandbox = self.daytona.create(
            CreateSandboxFromImageParams(
                image=image,
                env_vars={"OH_SESSION_API_KEYS_0": session_api_key},
                labels={"platform": "vyzorix"},
            )
        )
        # Agent server starts via the image's entrypoint
        # Get preview URLs for exposed ports
        exposed_urls = [
            ExposedUrl(name="AGENT_SERVER", 
                      url=sandbox.get_preview_link(60000).url, 
                      port=60000),
        ]
        return SandboxInfo(
            id=sandbox.id, status=SandboxStatus.STARTING,
            exposed_urls=exposed_urls, ...
        )
    
    async def pause_sandbox(self, sandbox_id):
        sandbox = self.daytona.get(sandbox_id)
        sandbox.stop()
        return True
    
    async def resume_sandbox(self, sandbox_id):
        sandbox = self.daytona.get(sandbox_id)
        sandbox.start()
        return True
    
    # ... etc
```

---

## Part 4: Implementation Roadmap

### Phase 1: Foundation (1-2 weeks)
1. **Build the agent server Docker image** for Daytona
   - Package OpenHands agent server into a Docker image
   - Ensure it starts on port 60000 and responds to `/alive`
   - Push to a container registry (Docker Hub, GHCR)
   
2. **Create `DaytonaSandboxService`**
   - Implement all abstract methods from `SandboxService`
   - Handle Daytona state → OpenHands status mapping
   - Implement session API key tracking
   
3. **Wire up configuration**
   - Add `DaytonaSandboxServiceInjector`
   - Add `RUNTIME=daytona` environment variable support
   - Configure Daytona API credentials

### Phase 2: Frontend Rebrand (1 week)
1. Replace SVG logos in `frontend/src/assets/branding/`
2. Update page title in `root.tsx`
3. Search-and-replace "OpenHands" in UI strings and i18n files
4. Customize color scheme in Tailwind config
5. Update `package.json` name and metadata

### Phase 3: Integration Testing (1-2 weeks)
1. End-to-end: start conversation → agent executes code → results shown
2. Sandbox lifecycle: create, pause, resume, delete
3. File operations: upload/download between agent and sandbox
4. Terminal/browser access via Daytona preview URLs
5. Error handling: sandbox failures, timeout, network issues

### Phase 4: Polish & Deploy (1 week)
1. Remove billing/payment code from frontend (or customize)
2. Set up deployment (can self-host the app server anywhere)
3. Configure LLM provider (your API keys for Claude/GPT/etc.)
4. Documentation and user testing

---

## Part 5: Risk Assessment

### High Risk
| Risk | Impact | Mitigation |
|---|---|---|
| **Agent server inside Daytona** | The agent server needs to run reliably inside Daytona sandboxes. Cold start times may be slow. | Pre-build Docker image with all dependencies. Use Daytona snapshots for fast restarts. |
| **LLM costs** | LLM API calls are the real ongoing cost, not sandbox compute. | Use free-tier models (Gemini, open-source via Ollama), or budget for API costs. |
| **Daytona free tier limits** | $200 credit will eventually run out with active use. | Implement aggressive auto-stop. Apply for Daytona startup program ($50k credits). |

### Medium Risk
| Risk | Impact | Mitigation |
|---|---|---|
| **Preview URL latency** | Daytona preview URLs add network hops vs local Docker. | Test latency; may need WebSocket connection handling adjustments. |
| **No pause/resume in Daytona** | Daytona uses stop/start, not pause/unpause. Stopped sandboxes lose running processes. | Accept cold restarts. Use snapshots to preserve filesystem state. |
| **AGPL license on Daytona** | If you modify Daytona's code, you must open-source changes. | Don't modify Daytona — only use its SDK/API. The SDK is a client library, not the server. |

### Low Risk
| Risk | Impact | Mitigation |
|---|---|---|
| **Frontend rebrand** | Straightforward find-and-replace + asset swap. | Plan ~1 week, mostly mechanical work. |
| **OpenHands updates** | Staying in sync with upstream OpenHands becomes harder over time. | Keep changes modular. Use the DI system — don't fork internal code if possible. |

---

## Part 6: What You DON'T Get for Free

Even with OpenHands + Daytona, you still need:

1. **LLM API access** — Claude/GPT/Gemini API keys with budget
2. **App server hosting** — A server to run the OpenHands FastAPI app (could be a cheap VPS, Render free tier, or Railway)
3. **Domain & SSL** — For production deployment
4. **User authentication** — OpenHands has auth built in, but you'd need to configure it
5. **Database** — SQLite (default, file-based) or PostgreSQL for production

---

## Part 7: Quick Reference — Key Files to Modify

| Purpose | File Path |
|---|---|
| **New sandbox backend** | Create: `openhands/app_server/sandbox/daytona_sandbox_service.py` |
| **Config integration** | Modify: `openhands/app_server/config.py` (add Daytona branch) |
| **Page title** | `frontend/src/root.tsx` line 36 |
| **Logo** | Replace: `frontend/src/assets/branding/openhands-logo*.svg` |
| **Sidebar branding** | `frontend/src/components/features/sidebar/sidebar.tsx` |
| **Home header** | `frontend/src/components/features/home/home-header/` |
| **Sandbox models** | Reference: `openhands/app_server/sandbox/sandbox_models.py` |
| **Sandbox abstract class** | Reference: `openhands/app_server/sandbox/sandbox_service.py` |
| **Docker implementation** | Reference: `openhands/app_server/sandbox/docker_sandbox_service.py` |
| **LLM config** | `openhands/app_server/config.py` — provider URLs and settings |

---

## Conclusion

**Is this feasible?** Yes, with caveats.

**The good:**
- OpenHands' sandbox abstraction is **designed** for pluggability — adding a Daytona backend is exactly the kind of extension it supports
- Daytona's Python SDK is feature-rich and covers all sandbox operations you'd need
- Frontend rebranding is straightforward
- $200 free Daytona credit + potential $50k startup program makes initial costs zero

**The challenging:**
- You need to build and maintain a Docker image that runs OpenHands' agent server
- LLM API costs are the real expense (not sandbox compute)
- Daytona's stop/start model differs from OpenHands' pause/resume expectation
- Solo developer maintaining a fork of a fast-moving project is hard long-term

**Recommended first step:** Get a Daytona API key, create a sandbox with a simple Docker image, and verify you can run a FastAPI server inside it and access it via preview URLs. This proves the core integration before writing any OpenHands code.
