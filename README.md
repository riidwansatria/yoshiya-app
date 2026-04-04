# Yoshiya App

Internal operations app for Yoshiya, built with Next.js and Supabase. The current product includes bookings, schedule/customer tools, and a kitchen workspace for managing ingredients, components, menus, and related prep data.

## Stack

- Next.js 16 App Router
- React 19
- Supabase Auth + Postgres
- `next-intl` for English/Japanese UI
- Tailwind CSS + shadcn/base UI components

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Set the required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

3. Run the app:

```bash
npm run dev
```

4. Open `http://localhost:3000`.

## Main Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

There are also targeted Node tests for some utility modules, for example:

```bash
node --test lib/kitchen/realtime-merge.test.ts
```

## Kitchen Data Model

Kitchen management is centered on these tables:

- `ingredients`
- `components`
- `component_ingredients`
- `menus`
- `menu_components`

High-level relationships:

- A component belongs to a restaurant and contains many ingredients through `component_ingredients`.
- A menu belongs to a restaurant and contains many components through `menu_components`.
- Kitchen list/detail screens read from Supabase through shared query helpers in [`lib/queries/kitchen.ts`](/Users/ridwansatria/Projects/yoshiya-app/lib/queries/kitchen.ts).

## Kitchen Realtime Sync

The kitchen workspace now uses selective realtime sync with Supabase Realtime.

Realtime is enabled for:

- ingredients list
- components list
- ingredient edit dialog
- component edit page

Realtime is intentionally not enabled yet for:

- matrix pages
- summary pages
- bookings/schedule/customer surfaces

### Behavior

- Kitchen list screens subscribe to relevant table changes and refetch their dataset in-place.
- The UI does not rely on a full page refresh to see ingredient/component updates.
- Existing server actions still call `revalidatePath(...)` so normal navigation stays fresh even without an active subscription.

### Draft Protection Rules

The edit UX is conflict-aware so remote updates do not wipe active local work.

Ingredient edit dialog:

- Untouched scalar fields auto-update from the latest remote record.
- Dirty fields stay local.
- If another session deletes the ingredient, the local draft stays visible but saving is disabled.

Component edit page:

- Untouched scalar fields (`name`, `description`, `yield_servings`) auto-update.
- Ingredient rows are treated as higher risk.
- If the ingredient row array is still pristine, remote row changes can replace it.
- If the user has edited, added, removed, or reordered rows locally, the local draft wins and the app shows a conflict banner instead.
- If the component is deleted remotely, the draft stays visible but saving is disabled.

### Conflict UI

When remote changes overlap with a local draft, the app shows an inline banner with:

- `Review latest`
- `Reload from latest`

`Review latest` opens the latest remote snapshot without replacing the current draft. `Reload from latest` resets the local form to the newest remote version.

## Supabase Realtime Setup

Kitchen realtime depends on the migration:

- [`supabase/migrations/20260404000000_enable_kitchen_realtime.sql`](/Users/ridwansatria/Projects/yoshiya-app/supabase/migrations/20260404000000_enable_kitchen_realtime.sql)

This adds the kitchen tables to the `supabase_realtime` publication if they are not already present.

Relevant kitchen tables:

- `public.ingredients`
- `public.components`
- `public.component_ingredients`
- `public.menus`
- `public.menu_components`

## Key Files

- [`lib/queries/kitchen.ts`](/Users/ridwansatria/Projects/yoshiya-app/lib/queries/kitchen.ts)
Shared kitchen query layer for both server and browser clients.

- [`lib/realtime/kitchen.ts`](/Users/ridwansatria/Projects/yoshiya-app/lib/realtime/kitchen.ts)
Reusable Supabase subscription helper for kitchen scopes.

- [`lib/kitchen/realtime-merge.ts`](/Users/ridwansatria/Projects/yoshiya-app/lib/kitchen/realtime-merge.ts)
Merge/conflict logic used by realtime edit flows.

- [`components/kitchen/ingredients-table.tsx`](/Users/ridwansatria/Projects/yoshiya-app/components/kitchen/ingredients-table.tsx)
Realtime ingredients list UI.

- [`components/kitchen/components-list.tsx`](/Users/ridwansatria/Projects/yoshiya-app/components/kitchen/components-list.tsx)
Realtime components list UI.

- [`components/kitchen/ingredient-dialogs.tsx`](/Users/ridwansatria/Projects/yoshiya-app/components/kitchen/ingredient-dialogs.tsx)
Ingredient create/edit/delete dialogs, including conflict-aware edit syncing.

- [`components/kitchen/component-form.tsx`](/Users/ridwansatria/Projects/yoshiya-app/components/kitchen/component-form.tsx)
Component editor with conflict-aware realtime merging.

## Notes On Cost

The current realtime approach is intentionally scoped for a small team.

- Cost grows with concurrent users, open tabs, and mutation frequency.
- With a small kitchen team, selective realtime should be modest.
- If usage grows later, the next optimization would be patching local state from event payloads instead of refetching the full dataset after each relevant change.

## Verification Notes

For the kitchen realtime work, these are the most useful checks:

- targeted lint on touched files
- `node --test lib/kitchen/realtime-merge.test.ts`
- manual multi-tab testing against a real Supabase project

At the moment, the full repo lint command still reports unrelated pre-existing issues outside the kitchen realtime files, so use targeted checks when validating this feature area.
