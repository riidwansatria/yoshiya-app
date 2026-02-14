create table "public"."venues" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "name" text not null,
    "capacity" integer not null default 0,
    constraint "venues_pkey" primary key ("id")
);

alter table "public"."venues" enable row level security;
