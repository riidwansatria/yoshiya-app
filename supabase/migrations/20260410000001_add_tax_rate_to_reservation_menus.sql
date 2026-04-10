-- Add tax_rate column to reservation_menus
-- Stores the tax rate as a decimal (e.g., 0.10 for 10%, 0.08 for 8%)
-- Defaults to 10% which is the standard Japanese consumption tax
alter table "public"."reservation_menus"
  add column "tax_rate" numeric not null default 0.10;
