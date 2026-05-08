---
name: testing-vyzorix-rebrand
description: Test the Vyzorix frontend rebrand visually. Use when verifying branding changes (logos, colors, strings) in the OpenHands fork.
---

# Testing Vyzorix Rebrand

## Setup

1. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```

2. Start the dev server in mock API mode (no backend needed):
   ```bash
   npm run dev:mock
   ```
   This runs on `http://localhost:3001/` by default.

3. Open Chrome and navigate to `http://localhost:3001/`.

## What to Test

### 1. Browser Tab Title
- Tab should read "Vyzorix" (not "OpenHands")
- Controlled by: `frontend/src/root.tsx` and `frontend/src/hooks/use-app-title.ts`

### 2. Sidebar Logo
- Top-left sidebar should show a rose-colored geometric "V" logo
- Should NOT show the old OpenHands hands logo
- Logo files: `frontend/src/assets/branding/vyzorix-logo.svg` (rose-500) and `vyzorix-logo-white.svg` (white)
- Component: `frontend/src/components/shared/buttons/vyzorix-logo-button.tsx`

### 3. Brand Color (rose-500 #f43f5e)
- All primary-colored UI elements (buttons, accents) should be rose/pink, NOT yellow/gold
- **Important:** There are TWO separate color sources:
  - `frontend/tailwind.config.js` → `modal.primary` (maps to `bg-modal-primary`)
  - `frontend/src/tailwind.css` → `--color-primary` (maps to `bg-primary` used by BrandButton and other components)
  - Both must be set to `#f43f5e` for full coverage
- Also check `.loader` animation colors in `tailwind.css` and `--color-logo`
- The HeroUI theme in `frontend/hero.ts` has its own `primary` color (#4465DB blue) — this is separate

### 4. Translation Strings
- All visible UI text should read "Vyzorix" not "OpenHands"
- Controlled by: `frontend/src/i18n/translation.json`
- Known grammar issue: "an Vyzorix" should be "a Vyzorix" (inherited from "an OpenHands")

### 5. LLM Provider Dropdown
- The LLM Provider dropdown may still show "OpenHands" as a provider name — this is a backend value, not a translation string

## Common Pitfalls

- **Yellow Save button:** If the Save button is yellow/gold instead of rose, check `frontend/src/tailwind.css` `--color-primary`. The `bg-primary` class resolves to this CSS custom property, NOT to `modal.primary` in `tailwind.config.js`.
- **Mock mode proxy errors:** `ECONNREFUSED 127.0.0.1:3000` errors in the dev server console are expected — mock mode doesn't need a real backend.
- **HMR:** `tailwind.css` changes are hot-reloaded automatically — no need to restart the dev server.

## Lint Check

```bash
cd frontend && npm run lint
```

Should pass with 0 errors.
