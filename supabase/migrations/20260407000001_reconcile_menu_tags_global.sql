-- Reconcile menu_tags schema to the global-tag model across environments.
-- Safe to run on databases that still have legacy restaurant-scoped columns.

create table if not exists public.menu_tags (
  id uuid not null default gen_random_uuid(),
  label text not null,
  created_at timestamptz null default now(),
  updated_at timestamptz null default now(),
  constraint menu_tags_pkey primary key (id)
) tablespace pg_default;

-- Remove legacy restaurant scoping if it exists.
alter table public.menu_tags
  drop column if exists restaurant_id;

-- Enforce expected column contract for global tags.
alter table public.menu_tags
  alter column label set not null,
  alter column created_at set default now(),
  alter column updated_at set default now();

-- Keep only the global uniqueness rule for labels.
drop index if exists public.menu_tags_restaurant_label_unique_idx;
create unique index if not exists menu_tags_label_unique_idx
  on public.menu_tags using btree (lower(btrim(label)))
  tablespace pg_default;

-- Ensure updated_at trigger exists exactly once.
drop trigger if exists set_menu_tags_updated_at on public.menu_tags;
create trigger set_menu_tags_updated_at
before update on public.menu_tags
for each row
execute function public.handle_updated_at();
