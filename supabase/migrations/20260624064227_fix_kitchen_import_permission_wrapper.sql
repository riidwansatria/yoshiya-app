do $migration$
declare
    function_definition text;
begin
    select pg_get_functiondef(
        'public.apply_kitchen_import(text, uuid, text, jsonb)'::regprocedure
    )
    into function_definition;

    function_definition := replace(
        function_definition,
        'app_private.can_access',
        'public.can_access'
    );

    execute function_definition;
end;
$migration$;

revoke all
on function public.apply_kitchen_import(text, uuid, text, jsonb)
from public, anon;

grant execute
on function public.apply_kitchen_import(text, uuid, text, jsonb)
to authenticated;
