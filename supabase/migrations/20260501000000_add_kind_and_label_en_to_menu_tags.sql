-- Add kind (dietary | ingredient) and label_en to menu_tags.
-- Sequences after 20260420000001_invert_ingredient_tags_on_all_menus.

alter table public.menu_tags
    add column kind text not null default 'ingredient';

alter table public.menu_tags
    add constraint menu_tags_kind_check check (kind in ('dietary', 'ingredient'));

-- Backfill: only these four are dietary in production.
update public.menu_tags
set kind = 'dietary'
where lower(btrim(label)) in ('アレルゲンフリー', 'ヴィーガン', 'グルテンフリー', 'ハラール');

alter table public.menu_tags
    add column label_en text null;

create unique index menu_tags_label_en_unique_idx
    on public.menu_tags (lower(btrim(label_en)))
    where label_en is not null;
