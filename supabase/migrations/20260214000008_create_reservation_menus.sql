create table "public"."reservation_menus" (
    "id" uuid not null default gen_random_uuid(),
    "reservation_id" uuid not null references "public"."reservations"("id") on delete cascade,
    "menu_name" text not null,
    "quantity" integer not null default 1,
    "unit_price" integer not null default 0,
    "notes" text,
    constraint "reservation_menus_pkey" primary key ("id")
);

alter table "public"."reservation_menus" enable row level security;
