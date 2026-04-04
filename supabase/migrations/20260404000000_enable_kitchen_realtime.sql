do $$
begin
    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'ingredients'
    ) then
        alter publication supabase_realtime add table public.ingredients;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'components'
    ) then
        alter publication supabase_realtime add table public.components;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'component_ingredients'
    ) then
        alter publication supabase_realtime add table public.component_ingredients;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'menus'
    ) then
        alter publication supabase_realtime add table public.menus;
    end if;

    if not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'menu_components'
    ) then
        alter publication supabase_realtime add table public.menu_components;
    end if;
end
$$;
