alter table "public"."purchase_orders"
    add column if not exists "document_no" text;

alter table "public"."purchase_orders"
    add constraint purchase_orders_document_no_unique unique (restaurant_id, document_no);
