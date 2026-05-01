-- Invert (XOR) menu_tag_assignments for たまねぎ, ねぎ, なす, パプリカ only:
--   menus currently tagged  -> untag
--   menus currently untagged -> tag
-- Other tags are untouched.
--
-- Uses a single statement so the DELETE's RETURNING snapshot drives the INSERT,
-- avoiding a race between the two operations.

with target_tags as (
    select id
    from public.menu_tags
    where lower(btrim(label)) in ('たまねぎ', 'ねぎ', 'なす', 'パプリカ')
),
deleted as (
    delete from public.menu_tag_assignments
    where tag_id in (select id from target_tags)
    returning menu_id, tag_id
)
insert into public.menu_tag_assignments (menu_id, tag_id)
select m.id, t.id
from public.menus m
cross join target_tags t
where not exists (
    select 1 from deleted d
    where d.menu_id = m.id and d.tag_id = t.id
);
