-- ============================================================
-- Migration: Add display_id to reservations, customers, agencies
-- ============================================================

-- 1. Add prefix column to restaurants
alter table "public"."restaurants" add column "prefix" text;

-- 2. Helper function: generate random display ID
--    Character set: ABCDEFGHJKLMNPQRSTUVWXYZ23456789 (32 chars, no 0/O/1/I)
create or replace function public.random_display_id(length integer default 6)
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..length loop
    result := result || substr(chars, floor(random() * 32)::integer + 1, 1);
  end loop;
  return result;
end;
$$ language plpgsql volatile;

-- 3. Add display_id columns
alter table "public"."reservations"
  add column "display_id" text;

alter table "public"."customers"
  add column "display_id" text;

alter table "public"."agencies"
  add column "display_id" text;

-- 4. Backfill existing rows
update "public"."reservations" r
  set display_id = 'RES-' || coalesce(
    (select prefix from restaurants where id = r.restaurant_id), ''
  ) || '-' || public.random_display_id()
where display_id is null;

update "public"."customers"
  set display_id = 'CUS-' || public.random_display_id()
where display_id is null;

update "public"."agencies"
  set display_id = 'AGC-' || public.random_display_id()
where display_id is null;

-- 5. Now make columns NOT NULL + UNIQUE
alter table "public"."reservations"
  alter column "display_id" set not null,
  add constraint "reservations_display_id_unique" unique ("display_id");

alter table "public"."customers"
  alter column "display_id" set not null,
  add constraint "customers_display_id_unique" unique ("display_id");

alter table "public"."agencies"
  alter column "display_id" set not null,
  add constraint "agencies_display_id_unique" unique ("display_id");

-- 6. Trigger function for reservations (needs restaurant prefix)
create or replace function public.generate_reservation_display_id()
returns trigger as $$
declare
  prefix text;
  new_id text;
  max_retries integer := 10;
  i integer := 0;
begin
  if new.display_id is not null and new.display_id != '' then
    return new;
  end if;

  select r.prefix into prefix
    from public.restaurants r
    where r.id = new.restaurant_id;

  loop
    new_id := 'RES-' || coalesce(prefix, '') || '-' || public.random_display_id();
    
    -- Check for collision
    if not exists (select 1 from public.reservations where display_id = new_id) then
      new.display_id := new_id;
      return new;
    end if;

    i := i + 1;
    if i >= max_retries then
      raise exception 'Failed to generate unique display_id after % retries', max_retries;
    end if;
  end loop;
end;
$$ language plpgsql;

create trigger set_reservation_display_id
  before insert on public.reservations
  for each row
  execute function public.generate_reservation_display_id();

-- 7. Trigger function for customers
create or replace function public.generate_customer_display_id()
returns trigger as $$
declare
  new_id text;
  max_retries integer := 10;
  i integer := 0;
begin
  if new.display_id is not null and new.display_id != '' then
    return new;
  end if;

  loop
    new_id := 'CUS-' || public.random_display_id();

    if not exists (select 1 from public.customers where display_id = new_id) then
      new.display_id := new_id;
      return new;
    end if;

    i := i + 1;
    if i >= max_retries then
      raise exception 'Failed to generate unique display_id after % retries', max_retries;
    end if;
  end loop;
end;
$$ language plpgsql;

create trigger set_customer_display_id
  before insert on public.customers
  for each row
  execute function public.generate_customer_display_id();

-- 8. Trigger function for agencies
create or replace function public.generate_agency_display_id()
returns trigger as $$
declare
  new_id text;
  max_retries integer := 10;
  i integer := 0;
begin
  if new.display_id is not null and new.display_id != '' then
    return new;
  end if;

  loop
    new_id := 'AGC-' || public.random_display_id();

    if not exists (select 1 from public.agencies where display_id = new_id) then
      new.display_id := new_id;
      return new;
    end if;

    i := i + 1;
    if i >= max_retries then
      raise exception 'Failed to generate unique display_id after % retries', max_retries;
    end if;
  end loop;
end;
$$ language plpgsql;

create trigger set_agency_display_id
  before insert on public.agencies
  for each row
  execute function public.generate_agency_display_id();
