update purchase_orders
set document_no = sub.new_document_no
from (
    select
        id,
        'PO-' || extract(year from order_date)::text || '-' || lpad(
            row_number() over (
                partition by restaurant_id, extract(year from order_date)
                order by order_date asc, created_at asc, id asc
            )::text,
            4, '0'
        ) as new_document_no
    from purchase_orders
    where document_no is null
) sub
where purchase_orders.id = sub.id;

alter table "public"."purchase_orders"
    alter column "document_no" set not null;
