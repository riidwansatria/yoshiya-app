-- seed vendors from distinct store values in ingredients (skip nulls, empty strings, duplicates)
insert into "public"."vendors" ("name")
select distinct trim("store")
from "public"."ingredients"
where trim("store") is not null and trim("store") <> ''
on conflict do nothing;

-- add vendor_id FK to ingredients
alter table "public"."ingredients"
    add column if not exists "vendor_id" uuid references "public"."vendors"("id") on delete set null;

-- link existing ingredients to their vendor by matching store name
update "public"."ingredients" i
set vendor_id = v.id
from "public"."vendors" v
where trim(i.store) = v.name
  and i.store is not null
  and trim(i.store) <> '';
