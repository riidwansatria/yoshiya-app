-- Kitchen staff need to read menus to populate the order form combobox.
-- The original "Can read menus" policy required the 'menus' module, but kitchen
-- staff only have the 'kitchen' module. Allow reading menus for anyone with
-- kitchen.read access (in addition to the existing menus module path).

drop policy if exists "Can read menus" on public.menus;

create policy "Can read menus"
on public.menus
for select
to authenticated
using (
    (select app_private.can_access('menus', 'menus.read'))
    or (select app_private.can_access('kitchen', 'kitchen.read'))
);
