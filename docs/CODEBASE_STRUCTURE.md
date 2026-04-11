# Codebase Structure Blueprint

This document defines a comprehensive structure for the Yoshiya App codebase so features stay easy to find, test, and scale.

## Goals

- Keep route concerns in App Router files and move business logic out of routes.
- Keep UI split into reusable primitives and domain feature modules.
- Separate reads, writes, and realtime concerns in the data layer.
- Make imports predictable with clear layer boundaries.
- Support safe, incremental migration from the current structure.

## Recommended Structure

```text
.
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── login/
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   ├── customers/
│   │   ├── [restaurant]/
│   │   │   ├── bookings/
│   │   │   ├── ingredients/
│   │   │   ├── components/
│   │   │   ├── menus/
│   │   │   ├── kitchen/
│   │   │   │   ├── orders/
│   │   │   │   └── summary/
│   │   │   ├── schedule/
│   │   │   └── today/
│   │   └── @modal/
│   ├── print/
│   │   └── [restaurant]/
│   │       └── kitchen/
│   └── api/
│       └── invoice/
│           └── generate/
│
├── components/
│   ├── ui/                      # shadcn/base primitives only
│   ├── layout/                  # app shell and navigation components
│   ├── shared/                  # cross-feature presentational pieces
│   ├── bookings/
│   ├── customers/
│   ├── kitchen/
│   ├── schedule/
│   ├── settings/
│   ├── today/
│   ├── invoice/
│   ├── print/
│   └── dev/
│
├── features/                    # optional next step for strong domain encapsulation
│   ├── bookings/
│   │   ├── components/
│   │   ├── server/
│   │   │   ├── actions.ts
│   │   │   └── queries.ts
│   │   ├── schemas/
│   │   ├── mappers/
│   │   └── types.ts
│   ├── customers/
│   ├── kitchen/
│   ├── schedule/
│   └── shared/
│
├── lib/
│   ├── supabase/                # auth-aware clients (server/client/cache)
│   ├── queries/                 # read models (DB select + shape)
│   ├── actions/                 # write use-cases + cache invalidation
│   ├── realtime/                # subscriptions and sync utilities
│   ├── kitchen/                 # domain-specific pure logic (merge/conflict/etc)
│   ├── utils/                   # pure helpers (csv, math, tags, etc)
│   ├── constants/
│   ├── types/
│   └── validators/              # zod schemas and shared validation
│
├── hooks/
├── i18n/
├── messages/
├── public/
│   └── templates/
├── scripts/
├── supabase/
│   ├── migrations/
│   └── seed.sql
└── docs/
    └── CODEBASE_STRUCTURE.md
```

## What Goes Where

- app/: route segment composition only.
- components/: visual UI only (no direct Supabase calls).
- lib/queries: read-only data fetch functions.
- lib/actions: mutation workflows, validation orchestration, cache invalidation.
- lib/realtime: event subscriptions and refresh triggers.
- lib/kitchen: pure kitchen domain logic not tied to React.
- hooks/: generic client hooks that are domain-agnostic unless prefixed (for example useKitchenX).
- messages/: locale JSON only.
- scripts/: verification and operational scripts.
- supabase/migrations: schema changes and SQL policies.

## Dependency Rules

Use these rules to avoid architecture drift:

1. app can import components, lib, hooks, i18n.
2. components can import other components, hooks, lib/utils, lib/constants, types.
3. components should not import lib/supabase directly.
4. lib/actions can import lib/queries, lib/supabase, lib/validators, lib/constants, lib/utils.
5. lib/queries can import lib/supabase and lib/types, but no React code.
6. hooks should not import app route files.
7. scripts should never import app or components.

## Naming Conventions

- Route files: page.tsx, layout.tsx, loading.tsx, error.tsx.
- Server actions: verb-first (createIngredient, updateMenu, deleteBooking).
- Query files: domain-based plural modules (ingredients.ts, menus.ts).
- Component files: kebab-case for files, PascalCase exports.
- Validation schemas: entity-name.schema.ts when extracted.
- Types: keep close to feature unless broadly shared.

## Structure Improvements For Current Repo

Current repo is already close to a clean domain split. Highest-value improvements:

1. Move layout-only components into components/layout/.
2. Add lib/validators/ and migrate payload validation out of action files.
3. Add lib/constants/ for route tags, cache tags, and shared enums.
4. Create docs/ADR/ for architectural decisions (realtime, caching, i18n strategy).
5. Optionally introduce features/ as a gradual modularization layer.

## Suggested Incremental Migration Plan

1. Week 1: Create components/layout and move shell/navigation components. Status: Completed.
2. Week 1: Add lib/validators and extract one domain (ingredients) as template. Status: Completed.
3. Week 2: Centralize cache tag constants used by actions. Status: Completed.
4. Week 2: Add shared type modules for repeated DB row shapes. Status: Completed.
5. Week 3: Start features/kitchen for new work only (do not rewrite old code). Status: Completed (scaffolded for new development).
6. Week 4+: Migrate domain-by-domain opportunistically when touching files. Status: Ongoing by design.

### Migration Status Snapshot (April 2026)

- `components/layout/` now owns shell/navigation components.
- `lib/validators/ingredients.ts` is the initial extracted validation module.
- `lib/constants/cache-tags.ts` and `lib/constants/routes.ts` are the shared invalidation sources.
- `lib/types/kitchen.ts` centralizes shared kitchen row types.
- `features/kitchen/` exists as the new-work module boundary.

## Testing Layout Recommendation

- Unit tests next to pure utilities: lib/utils/*.test.ts.
- Domain logic tests next to logic files: lib/kitchen/*.test.ts.
- Server action tests under lib/actions/__tests__/ when feasible.
- Keep UI tests inside component domain folders once test framework is added.

## Pull Request Checklist For Structure Hygiene

- New files are in the correct layer.
- Route files do not contain heavy business logic.
- Mutations go through actions and include cache invalidation rules.
- Queries do not include UI transforms that belong to components.
- Imports follow layer dependency rules above.
