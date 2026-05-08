# Vyzorix Branding Rename Plan
## Safe vs Dangerous "OpenHands" References

---

## TL;DR

| Category | Count | Action |
|----------|-------|--------|
| **SAFE** — User-facing strings (UI text, titles, descriptions) | ~830 occurrences | Rename to "Vyzorix" |
| **SAFE** — Logo/asset file references | ~11 files | Replace SVGs, update imports |
| **SAFE** — Docs/marketing files | ~10 files | Rewrite or delete |
| **DANGEROUS** — Python package imports (`from openhands.*`) | 500+ files | DO NOT RENAME |
| **DANGEROUS** — Config env vars (`OH_*`, `OPENHANDS_*`) | ~30 vars | DO NOT RENAME |
| **DANGEROUS** — Docker/CI references | ~15 files | DO NOT RENAME |
| **DANGEROUS** — Database table names | ~5 tables | DO NOT RENAME |

---

## SAFE TO RENAME (User-Facing Only)

### 1. Frontend UI Strings (~830 in translation.json)

**File:** `frontend/src/i18n/translation.json`
- 821 occurrences of "OpenHands" across all languages
- These are ONLY displayed text — renaming them changes what users see, nothing else
- **Action:** Find-replace `"OpenHands"` → `"Vyzorix"` in this file only
- **Risk:** Zero — these are just display strings

### 2. App Title & Meta

| File | Line | Current | New |
|------|------|---------|-----|
| `frontend/src/root.tsx` | 36 | `{ title: "OpenHands" }` | `{ title: "Vyzorix" }` |
| `frontend/src/hooks/use-app-title.ts` | 5 | `const APP_TITLE_OSS = "OpenHands"` | `const APP_TITLE_OSS = "Vyzorix"` |
| `frontend/src/hooks/use-app-title.test.tsx` | 46, 103 | `"OpenHands"` | `"Vyzorix"` |
| `openhands/app_server/app.py` | 55-56 | `title='OpenHands'`, `description='OpenHands: Code Less, Make More'` | `title='Vyzorix'`, `description='Vyzorix: AI-Driven Development'` |

### 3. Logo Assets

| Current File | Action |
|-------------|--------|
| `frontend/src/assets/branding/openhands-logo.svg` | Replace with Vyzorix logo SVG |
| `frontend/src/assets/branding/openhands-logo-white.svg` | Replace with Vyzorix white logo SVG |

**Files that import these logos (update import paths):**
| File | Import to Update |
|------|-----------------|
| `frontend/src/routes/onboarding-form.tsx` | `openhands-logo-white.svg` → `vyzorix-logo-white.svg` |
| `frontend/src/routes/information-request.tsx` | `openhands-logo-white.svg` → `vyzorix-logo-white.svg` |
| `frontend/src/routes/accept-tos.tsx` | `openhands-logo.svg` → `vyzorix-logo.svg` |
| `frontend/src/routes/shared-conversation.tsx` | `openhands-logo.svg` → `vyzorix-logo.svg` |
| `frontend/src/components/features/onboarding/information-request-form.tsx` | `openhands-logo-white.svg` → `vyzorix-logo-white.svg` |
| `frontend/src/components/features/waitlist/reauth-modal.tsx` | `openhands-logo.svg` → `vyzorix-logo.svg` |
| `frontend/src/components/features/waitlist/email-verification-modal.tsx` | `openhands-logo.svg` → `vyzorix-logo.svg` |
| `frontend/src/components/features/payment/setup-payment-modal.tsx` | `openhands-logo.svg` → `vyzorix-logo.svg` |
| `frontend/src/components/features/sidebar/sidebar.tsx` | `openhands-logo-button` import |
| `frontend/src/components/features/auth/login-content.tsx` | `openhands-logo-white.svg` → `vyzorix-logo-white.svg` |
| `frontend/src/components/shared/buttons/openhands-logo-button.tsx` | Rename file + update imports |

### 4. LLM Provider Display Name

| File | Line | Current | New |
|------|------|---------|-----|
| `frontend/src/utils/map-provider.ts` | 26 | `openhands: "OpenHands"` | `openhands: "Vyzorix"` |

### 5. Docs/Marketing Files

| File | Action |
|------|--------|
| `README.md` | Rewrite for Vyzorix |
| `CREDITS.md` | Delete or rewrite |
| `COMMUNITY.md` | Delete |
| `CITATION.cff` | Delete |
| `CODE_OF_CONDUCT.md` | Keep (generic) or delete |
| `CONTRIBUTING.md` | Delete or rewrite |
| `CNAME` | Update to your domain |

---

## DANGEROUS — DO NOT RENAME

### 1. Python Package Name: `openhands/`

The entire Python codebase uses `from openhands.xxx import yyy`. Examples:
```python
from openhands.app_server.app import app
from openhands.app_server.sandbox.sandbox_service import SandboxService
from openhands.sdk.llm.utils.verified_models import VERIFIED_MODELS
```

**Why dangerous:**
- 500+ files with `import openhands` or `from openhands`
- Renaming the directory means updating EVERY import across the entire codebase
- `pyproject.toml` package name, entry points, and build config all reference `openhands`
- The SDK package `openhands-sdk` expects this namespace
- Would break ALL tests, ALL CI, ALL Docker builds

**DO NOT TOUCH.** Internal package names are invisible to users.

### 2. Config Environment Variables

These are used in code logic, not just displayed:
```
OH_PERSISTENCE_DIR
OH_PERMITTED_CORS_ORIGINS_0
OH_ENABLE_ONBOARDING
OPENHANDS_CONFIG_CLS
OPENHANDS_PROVIDER_BASE_URL
```

**Why dangerous:** Changing these means updating both the Python code that reads them AND any deployment configs, Docker files, and documentation that sets them. High risk of breaking deployments.

### 3. Docker References

| File | Reference | Why Dangerous |
|------|-----------|--------------|
| `containers/app/Dockerfile` | `openhands` user (UID 42420) | Linux user account, permissions |
| `containers/app/entrypoint.sh` | `openhands` group references | File permission setup |
| `docker-compose.yml` | `openhands:latest` image name | Build/deploy pipeline |
| `.github/workflows/` | Container registry references | CI/CD |

### 4. Database Tables

```
v1_remote_sandbox
v1_conversation
v1_event_callback
```
These don't contain "openhands" but the `.openhands` persistence directory does:
- `~/.openhands/` — default data directory
- `openhands.db` — SQLite database filename

**Renaming these would lose existing data on upgrades.**

### 5. API Route Paths

The API routes like `/api/v1/...` don't contain "openhands" — they're clean. No changes needed.

### 6. Frontend Internal Type Names

```typescript
// These are TypeScript types, not user-visible:
OpenHandsEvent, OpenHandsObservation, OpenHandsAction
isOpenHandsEvent(), isOpenHandsObservation()
```

**These could theoretically be renamed** but it's pure refactoring with zero user impact and high risk of introducing bugs. Not worth it.

---

## Rename Script (Safe Strings Only)

A script CAN be written but it should ONLY target:
1. `translation.json` — bulk replace display strings
2. Specific hardcoded strings in ~10 `.tsx`/`.ts` files listed above
3. `app.py` title/description
4. Logo file renames + import path updates

**The script should NOT use a blanket `sed` on the whole codebase.** Each replacement should be targeted and verified.

---

## Recommended Approach

1. **Rename logo SVGs** → `vyzorix-logo.svg`, `vyzorix-logo-white.svg`
2. **Update ~11 logo import paths** in TSX files
3. **Rename `openhands-logo-button.tsx`** → `vyzorix-logo-button.tsx`
4. **Bulk replace in `translation.json`** — `"OpenHands"` → `"Vyzorix"` (safe, just display text)
5. **Update 4-5 hardcoded strings** — `root.tsx`, `use-app-title.ts`, `app.py`, `map-provider.ts`
6. **Rewrite `README.md`**
7. **Delete marketing docs** — `CREDITS.md`, `COMMUNITY.md`, `CITATION.cff`
8. **Leave everything else untouched**

Total: ~15 files to modify, ~3 files to rename, ~4 files to delete. All safe, no build risk.
