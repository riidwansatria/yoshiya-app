-- Backfill profile emails used by the staff username display from Supabase Auth.
-- Older staff rows can have an Auth login email while public.users.email is null.

update public.users
set email = auth.users.email
from auth.users
where public.users.id = auth.users.id
  and auth.users.email is not null
  and (
    public.users.email is null
    or btrim(public.users.email) = ''
  );
