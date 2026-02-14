create table "public"."users" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "role" text not null CHECK (role IN ('manager', 'staff', 'part-time')),
    "email" text,
    constraint "users_pkey" primary key ("id")
);

alter table "public"."users" enable row level security;
