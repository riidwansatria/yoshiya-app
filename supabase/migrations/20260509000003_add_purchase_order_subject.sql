alter table "public"."purchase_orders"
    add column if not exists "subject" text not null default '発注書';
