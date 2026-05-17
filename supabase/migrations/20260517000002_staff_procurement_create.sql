-- Staff with the procurement module can create purchase orders (e.g. from 仕込み表).
-- The initial role_permissions seed gave staff procurement.read and procurement.update
-- but omitted procurement.create, blocking the "Create PO from summary" workflow.

insert into public.role_permissions (role, permission)
values ('staff', 'procurement.create')
on conflict (role, permission) do nothing;
