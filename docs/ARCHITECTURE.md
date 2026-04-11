# Architecture

## Layer dependency rules

| Layer | May import |
|---|---|
| `app/` | `components/`, `lib/`, `hooks/`, `i18n` |
| `components/` | other `components/`, `hooks/`, `lib/utils`, `lib/constants`, types |
| `lib/actions/` | `lib/queries/`, `lib/supabase/`, `lib/validators/`, `lib/utils/` |
| `lib/queries/` | `lib/supabase/`, types — no React |
| `hooks/` | `lib/utils`, `lib/types` — not app route files |
| `scripts/` | nothing from `app/` or `components/` |

**Critical:** `components/` must never import `lib/supabase` directly. Data reaches components either as props from Server Components or via server actions.

## Server vs Client components

Default to Server Components. Add `'use client'` only when a component needs:
- browser-only APIs (`useEffect`, `useState`, event handlers)
- Supabase Realtime subscriptions
- `next-intl`'s `useTranslations` hook

Server Components can pass data down as props to Client Components, but cannot pass non-serialisable values (functions, class instances). Keep `'use client'` boundaries as deep in the tree as possible.

## Supabase client selection

| Context | Client |
|---|---|
| Server Components, server actions | `lib/supabase/server.ts` — `createClient()` (cookie-aware) |
| Client Components (non-realtime reads) | `lib/supabase/client.ts` — `createClient()` (browser) |
| Realtime subscriptions | same browser client, passed to `subscribeToKitchenScope()` |
| Inside `unstable_cache` callbacks | `lib/supabase/cache.ts` — `createCacheClient()` (no cookies) |

`createCacheClient()` runs outside the request context so it cannot read cookies or headers. Only use it for public-read data protected by RLS. Never use it for writes or user-scoped queries.

## Data fetching patterns

### Server-side queries with `unstable_cache`

Queries in `lib/queries/` wrap `lib/queries/kitchen.ts` fetch helpers with `unstable_cache` for deduplication and tag-based invalidation:

```ts
export const getIngredients = unstable_cache(
    async () => fetchKitchenIngredients(createCacheClient()),
    ['ingredients'],
    { tags: ['ingredients'], revalidate: 3600 }
);
```

### Server actions and cache invalidation

Actions in `lib/actions/` use the cookie-aware server client, validate, mutate, then invalidate caches:

```ts
'use server';
// 1. Validate payload
// 2. Mutate via server client
// 3. Invalidate cache tags and paths
updateTag('ingredients');
revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
```

Always call both `updateTag` (for `unstable_cache` tags) and `revalidatePath` (for router cache) after a mutation so both the cached data and the page cache are cleared.

### Router cache

`next.config.ts` sets `staleTimes: { dynamic: 30 }`, meaning dynamic routes are client-side cached for 30 seconds. This reduces redundant fetches on quick navigation. Mutations that call `revalidatePath` bypass this cache immediately.

### Return shape convention

Actions return `{ success: true, data?: T }` on success and `{ error: string }` on failure. Components check `result.error` before proceeding.

## Dashboard layout

`app/dashboard/layout.tsx` composes two context providers before the shell:

```
SettingsProvider (menuTags, staff, userRole)
└── SidebarProvider
    ├── AppSidebar (variant="inset", collapsible="icon")
    └── SidebarInset
        ├── <header> (SidebarTrigger, breadcrumbs)
        └── <div className="flex-1 flex flex-col overflow-y-auto">
            └── {children}   ← page content uses flex-1 here
```

Key constraints on `SidebarInset`:
- `h-[calc(100svh-1rem)]` — matches the 2×`m-2` (16 px = 1 rem) inset margins so the card fills the viewport exactly
- `overflow-hidden` — required to clip child content within the `rounded-xl` corners
- The inner `flex-1 overflow-y-auto` div is the only scroll container; do not add scroll to page content directly

The `@modal` parallel route slot is rendered alongside `{children}` and is used for sheets and dialogs that overlay the current page without a full navigation.

## Naming conventions

| Thing | Convention |
|---|---|
| Route files | `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` |
| Server actions | verb-first — `createIngredient`, `updateMenu`, `deleteBooking` |
| Query files | domain-based plural — `ingredients.ts`, `menus.ts` |
| Component files | kebab-case filenames, PascalCase exports |
| Hooks | `use-` prefix, domain-prefixed when scoped — `useKitchenSync` |
| Validation schemas | `entity-name.schema.ts` when extracted to own file |
| Types | keep close to feature; share via `lib/types/` only when used across 3+ domains |
