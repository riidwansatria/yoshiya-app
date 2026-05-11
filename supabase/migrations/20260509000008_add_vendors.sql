create table if not exists "public"."vendors" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text,
    "tel" text,
    "fax" text,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "vendors_pkey" primary key ("id"),
    constraint "vendors_name_check" check (length(trim("name")) > 0)
);

alter table "public"."vendors" enable row level security;

create policy "Allow public read access" on "public"."vendors" for select using (true);
create policy "Allow public insert" on "public"."vendors" for insert with check (true);
create policy "Allow public update" on "public"."vendors" for update using (true);
create policy "Allow public delete" on "public"."vendors" for delete using (true);

drop trigger if exists set_vendors_updated_at on "public"."vendors";
create trigger set_vendors_updated_at
before update on "public"."vendors"
for each row
execute function public.handle_updated_at();

alter table "public"."purchase_orders"
    add column if not exists "vendor_id" uuid references "public"."vendors"("id") on delete set null;

alter table "public"."purchase_orders"
    add column if not exists "recipient_email" text;
