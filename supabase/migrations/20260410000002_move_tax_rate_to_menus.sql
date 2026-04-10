-- Add tax_rate to menus table as the source of truth
-- It is also stored in reservation_menus (added in previous migration)
-- as a snapshot at booking time, similar to menu_name and unit_price
alter table "public"."menus"
  add column "tax_rate" numeric not null default 0.10;
