create table "public"."reservation_staff" (
    "id" uuid not null default gen_random_uuid(),
    "reservation_id" uuid not null references "public"."reservations"("id") on delete cascade,
    "user_id" uuid not null references "public"."users"("id") on delete cascade,
    "role" text not null default 'service' check (role in ('prep', 'service', 'cleaning')),
    "duration_minutes" integer default 0,
    constraint "reservation_staff_pkey" primary key ("id")
);

alter table "public"."reservation_staff" enable row level security;
