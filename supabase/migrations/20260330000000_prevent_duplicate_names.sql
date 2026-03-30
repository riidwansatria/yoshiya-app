create unique index if not exists ingredients_name_unique_ci_idx
    on public.ingredients (lower(btrim(name)));

create unique index if not exists components_restaurant_name_unique_ci_idx
    on public.components (restaurant_id, lower(btrim(name)));

create unique index if not exists menus_restaurant_name_unique_ci_idx
    on public.menus (restaurant_id, lower(btrim(name)));
