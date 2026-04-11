# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start dev server at http://localhost:3000
npm run build     # production build
npm run lint      # eslint (repo has pre-existing unrelated warnings — use targeted checks)
```

Targeted lint on touched files:
```bash
npx eslint path/to/file.ts
```

Node-native tests for pure utility modules (no test framework required):
```bash
node --test lib/kitchen/realtime-merge.test.ts
node --test lib/utils/fraction-quantity.test.ts
node --test lib/utils/menu-tags.test.ts
```

## Stack

- **Next.js 16 App Router**, React 19, TypeScript, Tailwind CSS v4
- **Supabase** — auth + Postgres, `@supabase/ssr` for cookie-based sessions
- **next-intl** — English/Japanese i18n, locale resolved from `NEXT_LOCALE` cookie (default: `ja`)
- **shadcn/ui** + **@base-ui/react** — UI primitives; base-ui used specifically for Combobox
- **react-hook-form** + **zod** — form validation

## Directory layout

```
app/              # Route segments only
  dashboard/
    layout.tsx    # Shell: SettingsProvider → SidebarProvider → SidebarInset
    [restaurant]/ # Dynamic restaurant context
    @modal/       # Parallel route for sheet/modal overlays
  print/, api/

components/       # Visual UI only — no direct Supabase calls
  ui/             # shadcn/base primitives
  kitchen/        # Kitchen feature components (realtime-aware)

lib/
  supabase/       # server.ts · client.ts · cache.ts
  queries/        # Read-only fetch functions (no React)
  actions/        # Server actions + cache invalidation
  realtime/       # Supabase channel subscriptions
  kitchen/        # Pure kitchen domain logic
  utils/          # Pure helpers

hooks/            # Generic client-side hooks
i18n/request.ts   # next-intl locale resolution
messages/         # en.json · ja.json
supabase/migrations/
scripts/          # Verification scripts (never import app or components)
```

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

## Further reading

- [Architecture](docs/ARCHITECTURE.md) — layer rules, Supabase client selection, data fetching, dashboard layout, naming conventions
- [Kitchen domain](docs/KITCHEN.md) — data model, realtime pattern, conflict resolution
- [i18n](docs/I18N.md) — next-intl setup, adding strings, Server vs Client usage
- [Codebase structure](docs/CODEBASE_STRUCTURE.md) — directory blueprint, migration plan, PR checklist
