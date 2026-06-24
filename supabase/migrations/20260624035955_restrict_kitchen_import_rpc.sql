revoke all
on function public.apply_kitchen_import(text, uuid, text, jsonb)
from public, anon;

grant execute
on function public.apply_kitchen_import(text, uuid, text, jsonb)
to authenticated;
