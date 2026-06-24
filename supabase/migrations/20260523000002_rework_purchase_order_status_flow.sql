alter table "public"."purchase_orders"
    add column if not exists "sent_at" timestamptz;

alter table "public"."purchase_orders"
    drop constraint if exists "purchase_orders_status_check";

update "public"."purchase_orders"
set "sent_at" = coalesce("sent_at", "updated_at")
where "recipient_email" is not null;

update "public"."purchase_orders"
set "status" = case
    when "recipient_email" is not null then 'sent'
    else 'draft'
end;

alter table "public"."purchase_orders"
    add constraint "purchase_orders_status_check"
    check ("status" in ('draft', 'sent'));
