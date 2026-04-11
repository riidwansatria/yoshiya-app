# Kitchen domain

## Data model

```
ingredients
  id, name, unit, category, store, package_size, package_label

components                          → belongs to a restaurant
  id, restaurant_id, name, description, yield_servings

component_ingredients               junction: component ↔ ingredient
  component_id, ingredient_id, qty_per_serving

menus                               → belongs to a restaurant
  id, restaurant_id, name, season, price, description, color

menu_components                     junction: menu ↔ component
  menu_id, component_id, qty_per_order

menu_tags
menu_tag_assignments                junction: menu ↔ tag
```

`ingredients` is global (no `restaurant_id`). `components` and `menus` are restaurant-scoped.

## Shared query layer

`lib/queries/kitchen.ts` exports fetch functions that accept a `KitchenClient` (plain `SupabaseClient`). This makes them usable from both server and browser contexts without duplication:

```ts
// Server (inside unstable_cache)
fetchIngredients(createCacheClient())

// Browser (realtime-aware Client Component)
fetchIngredients(createClient())
```

`lib/queries/ingredients.ts`, `lib/queries/components.ts`, etc. wrap these with `unstable_cache` for server-side use.

## Realtime scopes

`lib/realtime/kitchen.ts` exports `subscribeToKitchenScope()`, which sets up a Supabase Realtime channel for a named scope:

| Scope | Tables watched |
|---|---|
| `ingredients-list` | `ingredients`, `components` (restaurant-filtered), `component_ingredients` |
| `components-list` | `components`, `component_ingredients`, `ingredients`, `menus`, `menu_components` |
| `ingredient-record` | `ingredients` (filtered to one `id`) |
| `component-record` | `components` + `component_ingredients` (filtered to one `id`), `ingredients` |

Realtime is **not** enabled for matrix pages, summary pages, or bookings/schedule/customer surfaces.

## Realtime sync flow

Realtime-aware Client Components follow this pattern:

```
mount
  → create browser Supabase client
  → call subscribeToKitchenScope({ scope, restaurantId?, recordId?, onChange })
  → store returned channel ref

onChange fires
  → refetch the relevant dataset in-place (full refetch — not payload patching)
  → run merge logic (see below)
  → update local state

unmount
  → supabase.removeChannel(channel)
```

Server actions still call `revalidatePath()` so navigation stays fresh even without an active subscription.

## Merge and conflict logic

`lib/kitchen/realtime-merge.ts` provides pure functions for conflict-aware merging. No React, no side effects — unit-testable directly.

### Scalar fields — `mergeUntouchedFields`

```
for each field:
  if currentValue === remoteValue → skip (no change)
  if field is dirty (user has touched it) → mark as conflicting
  else → apply remote value
```

Returns `{ nextValues, applied_fields, conflicting_fields }`.

### Ingredient rows — `mergeComponentIngredientRows`

Ingredient rows are treated as a single unit (not field-by-field):

```
if remote rows === synced rows → no remote change, nothing to do
if current rows === synced rows → user hasn't touched rows, apply remote rows
else → user has edited rows AND remote changed → conflict
```

Returns `{ nextRows, remote_changed, applied_fields, conflicting_fields }`.

## Draft protection rules

### Ingredient edit dialog

- Untouched scalar fields auto-update from the latest remote record.
- Dirty fields (user has typed in them) stay local.
- If another session deletes the ingredient, the local draft stays visible but saving is disabled.

### Component edit page

- Untouched scalar fields (`name`, `description`, `yield_servings`) auto-update.
- If ingredient rows are still pristine (equal to the last synced snapshot), remote row changes replace them.
- If the user has edited, added, removed, or reordered rows locally, the local draft wins — a conflict banner appears instead.
- If the component is deleted remotely, the draft stays visible but saving is disabled.

## Conflict banner UI

When remote changes overlap a local draft, `RealtimeSyncBanner` renders inline with two actions:

- **Review latest** — opens the latest remote snapshot in a read-only view without replacing the current draft
- **Reload from latest** — resets the local form to the newest remote version (discards local draft)

## Key files

| File | Role |
|---|---|
| `lib/queries/kitchen.ts` | Shared fetch helpers (server + browser) |
| `lib/realtime/kitchen.ts` | `subscribeToKitchenScope()` — channel setup |
| `lib/kitchen/realtime-merge.ts` | Pure merge/conflict logic |
| `lib/kitchen/realtime-merge.test.ts` | Unit tests — run with `node --test` |
| `components/kitchen/ingredients-table.tsx` | Realtime ingredients list |
| `components/kitchen/components-list.tsx` | Realtime components list |
| `components/kitchen/ingredient-dialogs.tsx` | Create/edit/delete dialogs with conflict-aware sync |
| `components/kitchen/component-form.tsx` | Component editor with conflict-aware realtime merging |
| `components/kitchen/realtime-sync-banner.tsx` | Conflict banner UI |

## Realtime migration

Realtime requires the kitchen tables to be added to the `supabase_realtime` publication:

```
supabase/migrations/20260404000000_enable_kitchen_realtime.sql
```

Tables covered: `public.ingredients`, `public.components`, `public.component_ingredients`, `public.menus`, `public.menu_components`.

## Testing

```bash
node --test lib/kitchen/realtime-merge.test.ts
```

For full validation: targeted lint on touched files + this test + manual multi-tab testing against a real Supabase project. The full `npm run lint` has pre-existing unrelated issues outside the kitchen files.
