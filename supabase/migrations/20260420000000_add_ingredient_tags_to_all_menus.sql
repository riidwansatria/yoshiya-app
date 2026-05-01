-- Seed ingredient tags (たまねぎ, ねぎ, なす, パプリカ) and assign them to every existing menu.
-- Idempotent: uses the lower(btrim(label)) unique index on menu_tags and the
-- (menu_id, tag_id) primary key on menu_tag_assignments to skip duplicates.

insert into public.menu_tags (label)
values ('たまねぎ'), ('ねぎ'), ('なす'), ('パプリカ')
on conflict (lower(btrim(label))) do nothing;

insert into public.menu_tag_assignments (menu_id, tag_id)
select m.id, t.id
from public.menus m
cross join public.menu_tags t
where lower(btrim(t.label)) in ('たまねぎ', 'ねぎ', 'なす', 'パプリカ')
on conflict (menu_id, tag_id) do nothing;
