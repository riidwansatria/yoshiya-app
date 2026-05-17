-- Refactor authorization from broad public policies to role + module permissions.

alter table public.users
drop constraint if exists users_role_check;

update public.users
set role = case
    when role = 'manager' then 'admin'
    when role = 'part-time' then 'staff'
    when role in ('admin', 'owner', 'staff') then role
    else 'staff'
end;

alter table public.users
add constraint users_role_check
check (role in ('admin', 'owner', 'manager', 'staff'));

create table if not exists public.user_modules (
    user_id uuid not null references public.users(id) on delete cascade,
    module text not null,
    created_at timestamptz not null default now(),
    primary key (user_id, module),
    constraint user_modules_module_check check (
        module in (
            'reservations',
            'kitchen',
            'procurement',
            'skewer_shop',
            'menus',
            'reports',
            'staff_management',
            'settings'
        )
    )
);

create index if not exists user_modules_module_idx
on public.user_modules (module);

alter table public.user_modules enable row level security;

create table if not exists public.role_permissions (
    role text not null,
    permission text not null,
    created_at timestamptz not null default now(),
    primary key (role, permission),
    constraint role_permissions_role_check check (role in ('admin', 'owner', 'manager', 'staff')),
    constraint role_permissions_permission_check check (
        permission in (
            'reservations.read',
            'reservations.create',
            'reservations.update',
            'reservations.delete',
            'kitchen.read',
            'kitchen.update',
            'procurement.read',
            'procurement.create',
            'procurement.update',
            'procurement.delete',
            'skewer_shop.read',
            'skewer_shop.update',
            'menus.read',
            'menus.create',
            'menus.update',
            'menus.delete',
            'reports.read',
            'financials.read',
            'staff.read',
            'staff.manage',
            'settings.read',
            'settings.manage',
            'permissions.manage',
            'system.manage'
        )
    )
);

create index if not exists role_permissions_permission_idx
on public.role_permissions (permission);

alter table public.role_permissions enable row level security;

insert into public.role_permissions (role, permission)
select role, permission
from (
    values
        ('admin', 'reservations.read'),
        ('admin', 'reservations.create'),
        ('admin', 'reservations.update'),
        ('admin', 'reservations.delete'),
        ('admin', 'kitchen.read'),
        ('admin', 'kitchen.update'),
        ('admin', 'procurement.read'),
        ('admin', 'procurement.create'),
        ('admin', 'procurement.update'),
        ('admin', 'procurement.delete'),
        ('admin', 'skewer_shop.read'),
        ('admin', 'skewer_shop.update'),
        ('admin', 'menus.read'),
        ('admin', 'menus.create'),
        ('admin', 'menus.update'),
        ('admin', 'menus.delete'),
        ('admin', 'reports.read'),
        ('admin', 'financials.read'),
        ('admin', 'staff.read'),
        ('admin', 'staff.manage'),
        ('admin', 'settings.read'),
        ('admin', 'settings.manage'),
        ('admin', 'permissions.manage'),
        ('admin', 'system.manage'),

        ('owner', 'reservations.read'),
        ('owner', 'kitchen.read'),
        ('owner', 'procurement.read'),
        ('owner', 'skewer_shop.read'),
        ('owner', 'menus.read'),
        ('owner', 'reports.read'),
        ('owner', 'financials.read'),
        ('owner', 'staff.read'),
        ('owner', 'settings.read'),

        ('manager', 'reservations.read'),
        ('manager', 'reservations.create'),
        ('manager', 'reservations.update'),
        ('manager', 'reservations.delete'),
        ('manager', 'kitchen.read'),
        ('manager', 'kitchen.update'),
        ('manager', 'procurement.read'),
        ('manager', 'procurement.create'),
        ('manager', 'procurement.update'),
        ('manager', 'procurement.delete'),
        ('manager', 'skewer_shop.read'),
        ('manager', 'skewer_shop.update'),
        ('manager', 'menus.read'),
        ('manager', 'menus.create'),
        ('manager', 'menus.update'),
        ('manager', 'menus.delete'),
        ('manager', 'reports.read'),
        ('manager', 'staff.read'),
        ('manager', 'staff.manage'),
        ('manager', 'settings.read'),

        ('staff', 'reservations.read'),
        ('staff', 'reservations.create'),
        ('staff', 'reservations.update'),
        ('staff', 'kitchen.read'),
        ('staff', 'kitchen.update'),
        ('staff', 'procurement.read'),
        ('staff', 'procurement.update'),
        ('staff', 'skewer_shop.read'),
        ('staff', 'skewer_shop.update'),
        ('staff', 'menus.read')
) as seeded(role, permission)
on conflict (role, permission) do nothing;

insert into public.user_modules (user_id, module)
select u.id, modules.module
from public.users u
cross join (
    values
        ('reservations'),
        ('kitchen'),
        ('procurement'),
        ('skewer_shop'),
        ('menus'),
        ('reports'),
        ('staff_management'),
        ('settings')
) as modules(module)
where u.role = 'admin'
  and u.deleted_at is null
on conflict (user_id, module) do nothing;

insert into public.user_modules (user_id, module)
select u.id, 'reservations'
from public.users u
where u.role = 'staff'
  and u.deleted_at is null
on conflict (user_id, module) do nothing;

create schema if not exists app_private;

create or replace function app_private.current_user_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
    select public.users.role
    from public.users
    where public.users.id = (select auth.uid())
      and public.users.deleted_at is null
$$;

create or replace function app_private.has_module(required_module text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1
        from public.users
        join public.user_modules
          on public.user_modules.user_id = public.users.id
        where public.users.id = (select auth.uid())
          and public.users.deleted_at is null
          and public.user_modules.module = required_module
    )
    or app_private.current_user_role() in ('admin', 'owner')
$$;

create or replace function app_private.has_permission(required_permission text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select exists (
        select 1
        from public.users
        join public.role_permissions
          on public.role_permissions.role = public.users.role
        where public.users.id = (select auth.uid())
          and public.users.deleted_at is null
          and public.role_permissions.permission = required_permission
    )
$$;

create or replace function app_private.can_access(
    required_module text,
    required_permission text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select
        app_private.has_permission(required_permission)
        and (
            app_private.current_user_role() in ('admin', 'owner')
            or app_private.has_module(required_module)
        )
$$;

create or replace function public.can_access(
    required_module text,
    required_permission text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
    select app_private.can_access(required_module, required_permission)
$$;

revoke all on function public.can_access(text, text) from public;
grant execute on function public.can_access(text, text) to authenticated;

create or replace function public.get_public_menu_finder_items(required_restaurant_id text)
returns table (
    id uuid,
    restaurant_id text,
    name text,
    name_en text,
    description text,
    price integer,
    image_url text,
    color text,
    tax_rate numeric,
    is_public boolean,
    tags jsonb
)
language sql
security definer
set search_path = ''
stable
as $$
    select
        public.menus.id,
        public.menus.restaurant_id,
        public.menus.name,
        public.menus.name_en,
        public.menus.description,
        public.menus.price,
        public.menus.image_url,
        public.menus.color,
        public.menus.tax_rate,
        true as is_public,
        coalesce(
            jsonb_agg(
                distinct jsonb_build_object(
                    'id', public.menu_tags.id,
                    'label', public.menu_tags.label,
                    'label_en', public.menu_tags.label_en,
                    'kind', public.menu_tags.kind,
                    'created_at', public.menu_tags.created_at,
                    'updated_at', public.menu_tags.updated_at
                )
            ) filter (where public.menu_tags.id is not null),
            '[]'::jsonb
        ) as tags
    from public.menus
    left join public.menu_tag_assignments
      on public.menu_tag_assignments.menu_id = public.menus.id
    left join public.menu_tags
      on public.menu_tags.id = public.menu_tag_assignments.tag_id
    where public.menus.restaurant_id = required_restaurant_id
      and public.menus.is_public = true
    group by public.menus.id
$$;

revoke all on function public.get_public_menu_finder_items(text) from public;
grant execute on function public.get_public_menu_finder_items(text) to anon, authenticated;

-- Drop unsafe/public policies and previous permission policies.
drop policy if exists "Allow public read access" on public.restaurants;
drop policy if exists "Allow public read access" on public.venues;
drop policy if exists "Allow public insert" on public.venues;
drop policy if exists "Allow public update" on public.venues;
drop policy if exists "Allow public delete" on public.venues;
drop policy if exists "Allow public read access" on public.menus;
drop policy if exists "Allow public insert" on public.menus;
drop policy if exists "Allow public update" on public.menus;
drop policy if exists "Allow public delete" on public.menus;
drop policy if exists "Allow public read access" on public.users;
drop policy if exists "Allow public insert" on public.users;
drop policy if exists "Allow public update" on public.users;
drop policy if exists "Allow public delete" on public.users;
drop policy if exists "Allow public read access" on public.customers;
drop policy if exists "Allow public insert" on public.customers;
drop policy if exists "Allow public update" on public.customers;
drop policy if exists "Allow public delete" on public.customers;
drop policy if exists "Allow public read access" on public.agencies;
drop policy if exists "Allow public insert" on public.agencies;
drop policy if exists "Allow public update" on public.agencies;
drop policy if exists "Allow public delete" on public.agencies;
drop policy if exists "Allow public read access" on public.reservations;
drop policy if exists "Allow public insert" on public.reservations;
drop policy if exists "Allow public update" on public.reservations;
drop policy if exists "Allow public delete" on public.reservations;
drop policy if exists "Allow public read access" on public.reservation_menus;
drop policy if exists "Allow public insert" on public.reservation_menus;
drop policy if exists "Allow public update" on public.reservation_menus;
drop policy if exists "Allow public delete" on public.reservation_menus;
drop policy if exists "Allow public read access" on public.reservation_staff;
drop policy if exists "Allow public insert" on public.reservation_staff;
drop policy if exists "Allow public update" on public.reservation_staff;
drop policy if exists "Allow public delete" on public.reservation_staff;
drop policy if exists "Allow public read access" on public.ingredients;
drop policy if exists "Allow public insert" on public.ingredients;
drop policy if exists "Allow public update" on public.ingredients;
drop policy if exists "Allow public delete" on public.ingredients;
drop policy if exists "Allow public read access" on public.components;
drop policy if exists "Allow public insert" on public.components;
drop policy if exists "Allow public update" on public.components;
drop policy if exists "Allow public delete" on public.components;
drop policy if exists "Allow public read access" on public.component_ingredients;
drop policy if exists "Allow public insert" on public.component_ingredients;
drop policy if exists "Allow public update" on public.component_ingredients;
drop policy if exists "Allow public delete" on public.component_ingredients;
drop policy if exists "Allow public read access" on public.menu_components;
drop policy if exists "Allow public insert" on public.menu_components;
drop policy if exists "Allow public update" on public.menu_components;
drop policy if exists "Allow public delete" on public.menu_components;
drop policy if exists "Allow public read access" on public.daily_orders;
drop policy if exists "Allow public insert" on public.daily_orders;
drop policy if exists "Allow public update" on public.daily_orders;
drop policy if exists "Allow public delete" on public.daily_orders;
drop policy if exists "Allow public read access" on public.menu_tags;
drop policy if exists "Allow public insert" on public.menu_tags;
drop policy if exists "Allow public update" on public.menu_tags;
drop policy if exists "Allow public delete" on public.menu_tags;
drop policy if exists "Allow public read access" on public.menu_tag_assignments;
drop policy if exists "Allow public insert" on public.menu_tag_assignments;
drop policy if exists "Allow public update" on public.menu_tag_assignments;
drop policy if exists "Allow public delete" on public.menu_tag_assignments;
drop policy if exists "Allow public read access" on public.purchase_orders;
drop policy if exists "Allow public insert" on public.purchase_orders;
drop policy if exists "Allow public update" on public.purchase_orders;
drop policy if exists "Allow public delete" on public.purchase_orders;
drop policy if exists "Allow public read access" on public.purchase_order_lines;
drop policy if exists "Allow public insert" on public.purchase_order_lines;
drop policy if exists "Allow public update" on public.purchase_order_lines;
drop policy if exists "Allow public delete" on public.purchase_order_lines;
drop policy if exists "Allow public read access" on public.purchase_order_settings;
drop policy if exists "Allow public insert" on public.purchase_order_settings;
drop policy if exists "Allow public update" on public.purchase_order_settings;
drop policy if exists "Allow public delete" on public.purchase_order_settings;
drop policy if exists "Allow public read access" on public.vendors;
drop policy if exists "Allow public insert" on public.vendors;
drop policy if exists "Allow public update" on public.vendors;
drop policy if exists "Allow public delete" on public.vendors;

drop policy if exists "Can read role permissions" on public.role_permissions;
drop policy if exists "Can manage role permissions" on public.role_permissions;
drop policy if exists "Can read user modules" on public.user_modules;
drop policy if exists "Can manage user modules" on public.user_modules;

create policy "Can read role permissions"
on public.role_permissions
for select
to authenticated
using (true);

create policy "Can manage role permissions"
on public.role_permissions
for all
to authenticated
using ((select app_private.can_access('settings', 'permissions.manage')))
with check ((select app_private.can_access('settings', 'permissions.manage')));

create policy "Can read user modules"
on public.user_modules
for select
to authenticated
using (
    user_id = (select auth.uid())
    or (select app_private.can_access('staff_management', 'staff.read'))
);

create policy "Can manage user modules"
on public.user_modules
for all
to authenticated
using ((select app_private.can_access('staff_management', 'staff.manage')))
with check ((select app_private.can_access('staff_management', 'staff.manage')));

create policy "Can read restaurants"
on public.restaurants
for select
to authenticated
using (true);

create policy "Can read users"
on public.users
for select
to authenticated
using (
    id = (select auth.uid())
    or (select app_private.can_access('reservations', 'reservations.read'))
    or (select app_private.can_access('staff_management', 'staff.read'))
);

create policy "Can create users"
on public.users
for insert
to authenticated
with check ((select app_private.can_access('staff_management', 'staff.manage')));

create policy "Can update users"
on public.users
for update
to authenticated
using ((select app_private.can_access('staff_management', 'staff.manage')))
with check ((select app_private.can_access('staff_management', 'staff.manage')));

create policy "Can delete users"
on public.users
for delete
to authenticated
using ((select app_private.can_access('staff_management', 'staff.manage')));

create policy "Can read venues"
on public.venues
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create venues"
on public.venues
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update venues"
on public.venues
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete venues"
on public.venues
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.delete')));

create policy "Can read reservation data"
on public.reservations
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create reservations"
on public.reservations
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update reservations"
on public.reservations
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete reservations"
on public.reservations
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.delete')));

create policy "Can read reservation menus"
on public.reservation_menus
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create reservation menus"
on public.reservation_menus
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update reservation menus"
on public.reservation_menus
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete reservation menus"
on public.reservation_menus
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.delete')));

create policy "Can read reservation staff"
on public.reservation_staff
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create reservation staff"
on public.reservation_staff
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update reservation staff"
on public.reservation_staff
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete reservation staff"
on public.reservation_staff
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can read customers"
on public.customers
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create customers"
on public.customers
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update customers"
on public.customers
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete customers"
on public.customers
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.delete')));

create policy "Can read agencies"
on public.agencies
for select
to authenticated
using ((select app_private.can_access('reservations', 'reservations.read')));

create policy "Can create agencies"
on public.agencies
for insert
to authenticated
with check ((select app_private.can_access('reservations', 'reservations.create')));

create policy "Can update agencies"
on public.agencies
for update
to authenticated
using ((select app_private.can_access('reservations', 'reservations.update')))
with check ((select app_private.can_access('reservations', 'reservations.update')));

create policy "Can delete agencies"
on public.agencies
for delete
to authenticated
using ((select app_private.can_access('reservations', 'reservations.delete')));

create policy "Can read ingredients"
on public.ingredients
for select
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.read')));

create policy "Can create ingredients"
on public.ingredients
for insert
to authenticated
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can update ingredients"
on public.ingredients
for update
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')))
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can delete ingredients"
on public.ingredients
for delete
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can read components"
on public.components
for select
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.read')));

create policy "Can create components"
on public.components
for insert
to authenticated
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can update components"
on public.components
for update
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')))
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can delete components"
on public.components
for delete
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can read component ingredients"
on public.component_ingredients
for select
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.read')));

create policy "Can create component ingredients"
on public.component_ingredients
for insert
to authenticated
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can update component ingredients"
on public.component_ingredients
for update
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')))
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can delete component ingredients"
on public.component_ingredients
for delete
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can read daily orders"
on public.daily_orders
for select
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.read')));

create policy "Can create daily orders"
on public.daily_orders
for insert
to authenticated
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can update daily orders"
on public.daily_orders
for update
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')))
with check ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can delete daily orders"
on public.daily_orders
for delete
to authenticated
using ((select app_private.can_access('kitchen', 'kitchen.update')));

create policy "Can read menus"
on public.menus
for select
to authenticated
using ((select app_private.can_access('menus', 'menus.read')));

create policy "Can create menus"
on public.menus
for insert
to authenticated
with check ((select app_private.can_access('menus', 'menus.create')));

create policy "Can update menus"
on public.menus
for update
to authenticated
using ((select app_private.can_access('menus', 'menus.update')))
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can delete menus"
on public.menus
for delete
to authenticated
using ((select app_private.can_access('menus', 'menus.delete')));

create policy "Can read menu components"
on public.menu_components
for select
to authenticated
using (
    (select app_private.can_access('menus', 'menus.read'))
    or (select app_private.can_access('kitchen', 'kitchen.read'))
);

create policy "Can create menu components"
on public.menu_components
for insert
to authenticated
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can update menu components"
on public.menu_components
for update
to authenticated
using ((select app_private.can_access('menus', 'menus.update')))
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can delete menu components"
on public.menu_components
for delete
to authenticated
using ((select app_private.can_access('menus', 'menus.update')));

create policy "Can read menu tags"
on public.menu_tags
for select
to authenticated
using ((select app_private.can_access('menus', 'menus.read')));

create policy "Can create menu tags"
on public.menu_tags
for insert
to authenticated
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can update menu tags"
on public.menu_tags
for update
to authenticated
using ((select app_private.can_access('menus', 'menus.update')))
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can delete menu tags"
on public.menu_tags
for delete
to authenticated
using ((select app_private.can_access('menus', 'menus.update')));

create policy "Can read menu tag assignments"
on public.menu_tag_assignments
for select
to authenticated
using ((select app_private.can_access('menus', 'menus.read')));

create policy "Can create menu tag assignments"
on public.menu_tag_assignments
for insert
to authenticated
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can update menu tag assignments"
on public.menu_tag_assignments
for update
to authenticated
using ((select app_private.can_access('menus', 'menus.update')))
with check ((select app_private.can_access('menus', 'menus.update')));

create policy "Can delete menu tag assignments"
on public.menu_tag_assignments
for delete
to authenticated
using ((select app_private.can_access('menus', 'menus.update')));

create policy "Can read purchase orders"
on public.purchase_orders
for select
to authenticated
using ((select app_private.can_access('procurement', 'procurement.read')));

create policy "Can create purchase orders"
on public.purchase_orders
for insert
to authenticated
with check ((select app_private.can_access('procurement', 'procurement.create')));

create policy "Can update purchase orders"
on public.purchase_orders
for update
to authenticated
using ((select app_private.can_access('procurement', 'procurement.update')))
with check ((select app_private.can_access('procurement', 'procurement.update')));

create policy "Can delete purchase orders"
on public.purchase_orders
for delete
to authenticated
using ((select app_private.can_access('procurement', 'procurement.delete')));

create policy "Can read purchase order lines"
on public.purchase_order_lines
for select
to authenticated
using ((select app_private.can_access('procurement', 'procurement.read')));

create policy "Can create purchase order lines"
on public.purchase_order_lines
for insert
to authenticated
with check ((select app_private.can_access('procurement', 'procurement.update')));

create policy "Can update purchase order lines"
on public.purchase_order_lines
for update
to authenticated
using ((select app_private.can_access('procurement', 'procurement.update')))
with check ((select app_private.can_access('procurement', 'procurement.update')));

create policy "Can delete purchase order lines"
on public.purchase_order_lines
for delete
to authenticated
using ((select app_private.can_access('procurement', 'procurement.delete')));

create policy "Can read vendors"
on public.vendors
for select
to authenticated
using ((select app_private.can_access('procurement', 'procurement.read')));

create policy "Can create vendors"
on public.vendors
for insert
to authenticated
with check ((select app_private.can_access('procurement', 'procurement.create')));

create policy "Can update vendors"
on public.vendors
for update
to authenticated
using ((select app_private.can_access('procurement', 'procurement.update')))
with check ((select app_private.can_access('procurement', 'procurement.update')));

create policy "Can delete vendors"
on public.vendors
for delete
to authenticated
using ((select app_private.can_access('procurement', 'procurement.delete')));

create policy "Can read purchase order settings"
on public.purchase_order_settings
for select
to authenticated
using ((select app_private.can_access('procurement', 'procurement.read')));

create policy "Can create purchase order settings"
on public.purchase_order_settings
for insert
to authenticated
with check ((select app_private.can_access('procurement', 'procurement.update')));

create policy "Can update purchase order settings"
on public.purchase_order_settings
for update
to authenticated
using ((select app_private.can_access('procurement', 'procurement.update')))
with check ((select app_private.can_access('procurement', 'procurement.update')));

drop policy if exists "Authenticated can upload menu images" on storage.objects;
drop policy if exists "Authenticated can delete menu images" on storage.objects;

create policy "Can upload menu images"
on storage.objects for insert
to authenticated
with check (
    bucket_id = 'yoshiya-assets'
    and name like 'menus/%'
    and (select app_private.can_access('menus', 'menus.update'))
);

create policy "Can delete menu images"
on storage.objects for delete
to authenticated
using (
    bucket_id = 'yoshiya-assets'
    and name like 'menus/%'
    and (select app_private.can_access('menus', 'menus.update'))
);
