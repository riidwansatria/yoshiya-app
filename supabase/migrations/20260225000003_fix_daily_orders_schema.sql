-- Fix column names in daily_orders to match the Javascript application logic
alter table "public"."daily_orders" rename column "date" to "target_date";
alter table "public"."daily_orders" rename column "qty" to "quantity";
