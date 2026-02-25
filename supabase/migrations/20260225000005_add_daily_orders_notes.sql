-- Add notes column to daily_orders
alter table "public"."daily_orders" add column if not exists "notes" text;
