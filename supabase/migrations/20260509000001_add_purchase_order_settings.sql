create table if not exists "public"."purchase_order_settings" (
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "company_name" text not null default 'よしや',
    "postal_code" text,
    "address" text,
    "tel" text,
    "fax" text,
    "email" text,
    "contact_person" text,
    "show_postal_code" boolean not null default true,
    "show_address" boolean not null default true,
    "show_tel" boolean not null default true,
    "show_fax" boolean not null default true,
    "show_email" boolean not null default true,
    "show_contact_person" boolean not null default true,
    "created_at" timestamptz not null default now(),
    "updated_at" timestamptz not null default now(),
    constraint "purchase_order_settings_pkey" primary key ("restaurant_id")
);

alter table "public"."purchase_order_settings" enable row level security;

drop trigger if exists set_purchase_order_settings_updated_at on "public"."purchase_order_settings";
create trigger set_purchase_order_settings_updated_at
before update on "public"."purchase_order_settings"
for each row
execute function public.handle_updated_at();

drop policy if exists "Allow public read access" on "public"."purchase_order_settings";
drop policy if exists "Allow public insert" on "public"."purchase_order_settings";
drop policy if exists "Allow public update" on "public"."purchase_order_settings";

create policy "Allow public read access" on "public"."purchase_order_settings" for select using (true);
create policy "Allow public insert" on "public"."purchase_order_settings" for insert with check (true);
create policy "Allow public update" on "public"."purchase_order_settings" for update using (true);

insert into "public"."purchase_order_settings" (
    "restaurant_id",
    "company_name",
    "postal_code",
    "address",
    "tel",
    "fax",
    "email",
    "contact_person",
    "show_postal_code",
    "show_address",
    "show_tel",
    "show_fax",
    "show_email",
    "show_contact_person"
)
select
    "id",
    'よしや',
    '〒616-8384',
    '京都府京都市右京区嵯峨天龍寺造路町',
    null,
    null,
    null,
    null,
    true,
    true,
    true,
    true,
    true,
    true
from "public"."restaurants"
where "id" = 'kitchen'
on conflict ("restaurant_id") do nothing;
