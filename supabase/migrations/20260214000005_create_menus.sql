create table "public"."menus" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "name" text not null,
    "description" text,
    "price" integer not null default 0,
    constraint "menus_pkey" primary key ("id")
);

alter table "public"."menus" enable row level security;
