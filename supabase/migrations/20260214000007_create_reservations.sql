create table "public"."reservations" (
    "id" uuid not null default gen_random_uuid(),
    "restaurant_id" text not null references "public"."restaurants"("id") on delete cascade,
    "venue_id" uuid references "public"."venues"("id") on delete set null,
    "customer_id" uuid references "public"."customers"("id") on delete set null,
    "group_name" text,
    "date" date not null,
    "start_time" time not null,
    "end_time" time not null,
    "party_size" integer not null default 0,
    "status" text not null default 'pending' check (status in ('pending', 'confirmed', 'deposit_paid', 'completed', 'cancelled')),
    "attention_note" text,
    "budget" integer,
    "notes" text,
    
    -- Agency Snapshot Fields
    "agency_name" text,
    "agency_branch" text,
    "agency_tel" text,
    "agency_fax" text,
    "agency_postal_code" text,
    "agency_address" text,
    "agency_email" text,

    -- Staffing Snapshot Fields
    "arranger_name" text,
    "rep_name" text,
    "conductor_count" integer default 0,
    "crew_count" integer default 0,

    -- Timestamps
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "confirmed_at" timestamp with time zone,
    "cancelled_at" timestamp with time zone,
    
    constraint "reservations_pkey" primary key ("id")
);

alter table "public"."reservations" enable row level security;

-- Trigger to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
before update on public.reservations
for each row
execute procedure public.handle_updated_at();
