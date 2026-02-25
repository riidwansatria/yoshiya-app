-- Ingredients (Master list)
create table "public"."ingredients" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "unit" text not null,
    "category" text,
    "created_at" timestamptz default now(),
    constraint "ingredients_pkey" primary key ("id")
);

-- Components (Reusable recipe units)
create table "public"."components" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "name" text not null,
    "description" text,
    "yield_servings" integer not null default 1,
    "created_at" timestamptz default now(),
    constraint "components_pkey" primary key ("id")
);

-- Component Ingredients (Join table for component -> ingredient)
create table "public"."component_ingredients" (
    "component_id" uuid not null references "public"."components"("id") on delete cascade,
    "ingredient_id" uuid not null references "public"."ingredients"("id") on delete cascade,
    "qty_per_serving" numeric not null,
    constraint "component_ingredients_pkey" primary key ("component_id", "ingredient_id")
);

-- Menu Components (Join table for menu -> component)
create table "public"."menu_components" (
    "menu_id" uuid not null references "public"."menus"("id") on delete cascade,
    "component_id" uuid not null references "public"."components"("id") on delete cascade,
    "servings_per_order" numeric not null default 1,
    constraint "menu_components_pkey" primary key ("menu_id", "component_id")
);

-- Daily Orders (Daily order input)
create table "public"."daily_orders" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "date" date not null,
    "menu_id" uuid not null references "public"."menus"("id") on delete cascade,
    "qty" integer not null,
    "source" text default 'manual',
    "created_by" uuid references "public"."users"("id") on delete set null,
    "created_at" timestamptz default now(),
    constraint "daily_orders_pkey" primary key ("id")
);

-- Enable RLS
alter table "public"."ingredients" enable row level security;
alter table "public"."components" enable row level security;
alter table "public"."component_ingredients" enable row level security;
alter table "public"."menu_components" enable row level security;
alter table "public"."daily_orders" enable row level security;

-- RLS Policies
-- For now, mirroring previous "Allow public read access" pattern for ease of dev, and allowing all authenticated users (or anyone if anon) to modify.
-- (The app enforces auth via middleware, but DB level is open for now to avoid permission issues during rapid dev, as seen in previous phase).

create policy "Allow public read access" on "public"."ingredients" for select using (true);
create policy "Allow public insert" on "public"."ingredients" for insert with check (true);
create policy "Allow public update" on "public"."ingredients" for update using (true);
create policy "Allow public delete" on "public"."ingredients" for delete using (true);

create policy "Allow public read access" on "public"."components" for select using (true);
create policy "Allow public insert" on "public"."components" for insert with check (true);
create policy "Allow public update" on "public"."components" for update using (true);
create policy "Allow public delete" on "public"."components" for delete using (true);

create policy "Allow public read access" on "public"."component_ingredients" for select using (true);
create policy "Allow public insert" on "public"."component_ingredients" for insert with check (true);
create policy "Allow public update" on "public"."component_ingredients" for update using (true);
create policy "Allow public delete" on "public"."component_ingredients" for delete using (true);

create policy "Allow public read access" on "public"."menu_components" for select using (true);
create policy "Allow public insert" on "public"."menu_components" for insert with check (true);
create policy "Allow public update" on "public"."menu_components" for update using (true);
create policy "Allow public delete" on "public"."menu_components" for delete using (true);

create policy "Allow public read access" on "public"."daily_orders" for select using (true);
create policy "Allow public insert" on "public"."daily_orders" for insert with check (true);
create policy "Allow public update" on "public"."daily_orders" for update using (true);
create policy "Allow public delete" on "public"."daily_orders" for delete using (true);
