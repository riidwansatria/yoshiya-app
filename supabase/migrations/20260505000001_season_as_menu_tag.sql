-- Convert season from a text column on menus to a menu_tag with kind='season'.

-- 1. Extend the kind check constraint to include 'season'.
alter table public.menu_tags
    drop constraint menu_tags_kind_check;

alter table public.menu_tags
    add constraint menu_tags_kind_check check (kind in ('dietary', 'ingredient', 'season'));

-- 2. Migrate existing season values to tags and assignments.
do $$
declare
    season_val text;
    tag_id uuid;
begin
    for season_val in
        select distinct trim(season)
        from public.menus
        where season is not null and trim(season) <> ''
    loop
        insert into public.menu_tags (label, kind)
        values (season_val, 'season')
        on conflict (lower(btrim(label))) do nothing;

        select id into tag_id
        from public.menu_tags
        where lower(btrim(label)) = lower(btrim(season_val));

        insert into public.menu_tag_assignments (menu_id, tag_id)
        select id, tag_id
        from public.menus
        where trim(season) = season_val
        on conflict do nothing;
    end loop;
end $$;

-- 3. Drop the season column.
alter table public.menus drop column season;
