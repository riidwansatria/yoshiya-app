create table if not exists "public"."purchase_orders" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "supplier_name" text not null,
    "order_date" date not null default current_date,
    "status" text not null default 'draft',
    "source_type" text not null default 'blank',
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "purchase_orders_pkey" primary key ("id"),
    constraint "purchase_orders_status_check" check ("status" in ('draft', 'done')),
    constraint "purchase_orders_source_type_check" check ("source_type" in ('blank', 'summary')),
    constraint "purchase_orders_supplier_name_check" check (length(trim("supplier_name")) > 0)
);

create table if not exists "public"."purchase_order_lines" (
    "id" uuid not null default gen_random_uuid(),
    "purchase_order_id" uuid not null references "public"."purchase_orders"("id") on delete cascade,
    "ingredient_id" uuid references "public"."ingredients"("id") on delete set null,
    "item_name" text not null,
    "unit" text,
    "category" text,
    "needed_quantity" numeric,
    "package_size" numeric,
    "package_label" text,
    "order_quantity" numeric,
    "memo" text,
    "sort_order" integer not null default 0,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "purchase_order_lines_pkey" primary key ("id"),
    constraint "purchase_order_lines_item_name_check" check (length(trim("item_name")) > 0)
);

create index if not exists "purchase_orders_restaurant_updated_idx"
    on "public"."purchase_orders" ("restaurant_id", "updated_at" desc);

create index if not exists "purchase_orders_restaurant_date_idx"
    on "public"."purchase_orders" ("restaurant_id", "order_date" desc);

create index if not exists "purchase_order_lines_order_sort_idx"
    on "public"."purchase_order_lines" ("purchase_order_id", "sort_order", "created_at");

alter table "public"."purchase_orders" enable row level security;
alter table "public"."purchase_order_lines" enable row level security;

drop trigger if exists set_purchase_orders_updated_at on "public"."purchase_orders";
create trigger set_purchase_orders_updated_at
before update on "public"."purchase_orders"
for each row
execute function public.handle_updated_at();

drop trigger if exists set_purchase_order_lines_updated_at on "public"."purchase_order_lines";
create trigger set_purchase_order_lines_updated_at
before update on "public"."purchase_order_lines"
for each row
execute function public.handle_updated_at();

create policy "Allow public read access" on "public"."purchase_orders" for select using (true);
create policy "Allow public insert" on "public"."purchase_orders" for insert with check (true);
create policy "Allow public update" on "public"."purchase_orders" for update using (true);
create policy "Allow public delete" on "public"."purchase_orders" for delete using (true);

create policy "Allow public read access" on "public"."purchase_order_lines" for select using (true);
create policy "Allow public insert" on "public"."purchase_order_lines" for insert with check (true);
create policy "Allow public update" on "public"."purchase_order_lines" for update using (true);
create policy "Allow public delete" on "public"."purchase_order_lines" for delete using (true);
