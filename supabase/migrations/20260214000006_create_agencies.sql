create table "public"."agencies" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "branch" text,
    "tel" text,
    "fax" text,
    "address" text,
    "email" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    constraint "agencies_pkey" primary key ("id")
);

alter table "public"."agencies" enable row level security;
