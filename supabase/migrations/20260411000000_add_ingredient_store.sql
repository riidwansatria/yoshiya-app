-- Add a "store" (purchase location / supplier) column to ingredients
alter table "public"."ingredients"
    add column if not exists "store" text;
