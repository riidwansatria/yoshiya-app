alter table "public"."ingredients"
    add column if not exists "package_size" numeric,
    add column if not exists "package_label" text;

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'ingredients_package_size_positive'
    ) then
        alter table "public"."ingredients"
            add constraint "ingredients_package_size_positive"
            check ("package_size" is null or "package_size" > 0);
    end if;
end $$;
