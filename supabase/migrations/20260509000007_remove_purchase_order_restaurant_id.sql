-- drop indexes that reference restaurant_id
drop index if exists "purchase_orders_restaurant_updated_idx";
drop index if exists "purchase_orders_restaurant_date_idx";

-- drop the unique constraint that included restaurant_id
alter table "public"."purchase_orders"
    drop constraint if exists "purchase_orders_document_no_unique";

-- remove restaurant_id column
alter table "public"."purchase_orders"
    drop column if exists "restaurant_id";

-- new unique constraint on document_no alone
alter table "public"."purchase_orders"
    add constraint "purchase_orders_document_no_unique" unique ("document_no");

-- new indexes without restaurant_id
create index if not exists "purchase_orders_updated_idx"
    on "public"."purchase_orders" ("updated_at" desc);

create index if not exists "purchase_orders_date_idx"
    on "public"."purchase_orders" ("order_date" desc);
