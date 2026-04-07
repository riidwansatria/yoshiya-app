-- Make menu_tags global (remove restaurant_id)
drop index if exists "menu_tags_restaurant_label_unique_idx";

alter table "public"."menu_tags" drop column "restaurant_id";

create unique index "menu_tags_label_unique_idx"
    on "public"."menu_tags" (lower(btrim("label")));
