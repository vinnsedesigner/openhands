# Vyzorix Phase 2: Docs, Prompts & Marketing Rebrand Plan

## Summary

Found **~250+ "OpenHands" references** across docs, system prompts, agent skills, and marketing files. Here's how they break down:

---

## Category 1: AGENT IDENTITY (Critical — affects AI behavior)

These files define how the AI agent identifies itself. Without renaming these, the agent will say "I am OpenHands" when asked.

| File | Occurrences | Action |
|------|------------|--------|
| `.openhands/microagents/glossary.md` | 11 | Rename to Vyzorix |
| `skills/onboarding.md` | 1 | Rename to Vyzorix |
| `skills/agent-builder.md` | 9 | Rename display names; keep SDK URLs as-is (they point to upstream) |
| `skills/add_repo_inst.md` | 5 | Rename to Vyzorix |
| `skills/add_agent.md` | 3 | Rename to Vyzorix |
| `skills/README.md` | 23 | Rename to Vyzorix |
| `skills/onboarding.md` | 1 | Rename to Vyzorix |
| `skills/update_test.md` | 1 | Rename to Vyzorix |
| `skills/update_pr_description.md` | 1 | Rename to Vyzorix |
| `skills/address_pr_comments.md` | 1 | Rename to Vyzorix |
| `skills/fix_test.md` | 1 | Rename to Vyzorix |
| `skills/gitlab.md` | 1 | Rename to Vyzorix |
| `skills/agent_memory.md` | 1 | Rename to Vyzorix |
| `skills/github.md` | 1 | Rename to Vyzorix |
| `skills/azure_devops.md` | 1 | Rename to Vyzorix |
| `skills/bitbucket_data_center.md` | 1 | Rename to Vyzorix |
| `skills/bitbucket.md` | 1 | Rename to Vyzorix |

## Category 2: MAIN DOCS (Rename display names)

| File | Occurrences | Action |
|------|------------|--------|
| `AGENTS.md` | 32 | Rename display "OpenHands" to "Vyzorix"; keep `openhands` package/import paths |
| `Development.md` | 15 | Rename to Vyzorix |
| `CONTRIBUTING.md` | 17 | Rename to Vyzorix |
| `CREDITS.md` | 6 | Rename to Vyzorix |
| `CODE_OF_CONDUCT.md` | 3 | Rename to Vyzorix |
| `frontend/README.md` | 7 | Rename to Vyzorix |
| Various subdirectory READMEs | ~15 total | Rename to Vyzorix |

## Category 3: MARKETING — STRIP OR REPLACE

These are upstream-specific marketing materials that don't apply to Vyzorix.

| File / Section | Action |
|---------------|--------|
| `README.md` — OpenHands logo, badges, upstream links | **Replace entirely** with Vyzorix README |
| `README.md` — "Trusted by Engineers at" logos section | **Strip** (TikTok, Netflix, etc. are OpenHands customers, not yours) |
| `README.md` — Slack links, community links | **Strip or replace** with your own |
| `README.md` — SWE-Bench score badge | **Strip** (not your benchmark result) |
| `README.md` — Contributors SVG | **Strip** |
| `README.md` — Translation links (readme-i18n.com) | **Strip** (point to upstream repo) |
| `COMMUNITY.md` | **Strip entirely** (OpenHands-specific community info) |
| `.openhands/pre-commit.sh` | Rename echo message |

## Category 4: ENTERPRISE DOCS (Low priority)

| File | Occurrences | Action |
|------|------------|--------|
| `enterprise/README.md` | 13 | Rename to Vyzorix |
| `enterprise/doc/` various | ~100+ | Rename display names |

## Category 5: AGENT SKILLS (.agents/skills/)

| File | Occurrences | Action |
|------|------------|--------|
| `.agents/skills/update-sdk/SKILL.md` | 11 | Rename to Vyzorix |
| `.agents/skills/update-sdk/references/*.md` | ~37 | Rename to Vyzorix |
| `.agents/skills/cross-repo-testing/SKILL.md` | 25 | Rename to Vyzorix |
| `.agents/skills/custom-codereview-guide.md` | 3 | Rename to Vyzorix |
| `.agents/skills/testing-vyzorix-rebrand/SKILL.md` | 6 | Already uses Vyzorix + references openhands for internal paths (correct) |

---

## DO NOT TOUCH (same rules as Phase 1)

- Python `import openhands.*` statements
- `openhands/` directory name
- `OH_*` / `OPENHANDS_*` env vars
- Docker references (`openhands` user/group)
- `pyproject.toml` package name
- Database file names (`openhands.db`)
- GitHub URLs pointing to upstream `OpenHands/OpenHands` repo (keep as-is — they're valid references)
- `AppMode.OPENHANDS` enum values

---

## Implementation Order

1. **README.md** — Replace with Vyzorix-branded README (strip all upstream marketing)
2. **Agent identity** — `.openhands/microagents/glossary.md` + all `skills/*.md`
3. **AGENTS.md** — Rename display names only (keep technical paths)
4. **Other docs** — CONTRIBUTING.md, Development.md, CREDITS.md, CODE_OF_CONDUCT.md
5. **Enterprise docs** — enterprise/README.md and enterprise/doc/
6. **Frontend docs** — frontend/README.md, frontend/__tests__/*.md
7. **Misc** — .openhands/pre-commit.sh, .agents/skills/

**Estimated scope:** ~55 files, ~250+ string replacements (mostly safe display-name swaps)
