alter table "public"."purchase_order_settings"
    add column if not exists "email" text,
    add column if not exists "show_postal_code" boolean not null default true,
    add column if not exists "show_address" boolean not null default true,
    add column if not exists "show_tel" boolean not null default true,
    add column if not exists "show_fax" boolean not null default true,
    add column if not exists "show_email" boolean not null default true,
    add column if not exists "show_contact_person" boolean not null default true;
