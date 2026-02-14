create table "public"."customers" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "email" text,
    "phone" text,
    "visits" integer default 0,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "customers_pkey" primary key ("id")
);

alter table "public"."customers" enable row level security;
