insert into public.role_permissions (role, permission)
select 'owner', public.role_permissions.permission
from public.role_permissions
where public.role_permissions.role = 'admin'
on conflict (role, permission) do nothing;
