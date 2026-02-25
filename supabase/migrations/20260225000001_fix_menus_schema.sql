-- Add missing columns to menus table
alter table "public"."menus" add column if not exists "season" text;
alter table "public"."menus" add column if not exists "color" text;

-- Rename servings_per_order to qty_per_order to match application logic expectations
alter table "public"."menu_components" rename column "servings_per_order" to "qty_per_order";
