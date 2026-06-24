-- Kitchen import foundation:
-- - clarify component recipe quantity semantics
-- - add optimistic versions and integrity constraints
-- - add audited, atomic import previews
-- - expose one SECURITY INVOKER apply function for AI packs and matrix edits

-- Keep qty_per_serving temporarily as a deployment compatibility bridge. The
-- current production app can continue reading/writing it while the new app uses
-- batch_quantity. A later cleanup migration can drop the legacy column after
-- every deployment has moved to batch_quantity.
alter table public.component_ingredients
    add column if not exists batch_quantity numeric;

update public.component_ingredients
set batch_quantity = qty_per_serving
where batch_quantity is null;

alter table public.component_ingredients
    alter column batch_quantity set not null;

create or replace function public.sync_component_ingredient_quantity_columns()
returns trigger
language plpgsql
as $$
begin
    if tg_op = 'INSERT' then
        new.batch_quantity := coalesce(new.batch_quantity, new.qty_per_serving);
        new.qty_per_serving := coalesce(new.qty_per_serving, new.batch_quantity);
    elsif new.batch_quantity is distinct from old.batch_quantity
      and new.qty_per_serving is not distinct from old.qty_per_serving then
        new.qty_per_serving := new.batch_quantity;
    elsif new.qty_per_serving is distinct from old.qty_per_serving
      and new.batch_quantity is not distinct from old.batch_quantity then
        new.batch_quantity := new.qty_per_serving;
    elsif new.qty_per_serving is distinct from new.batch_quantity then
        raise exception 'Conflicting component ingredient quantities';
    end if;
    return new;
end;
$$;

drop trigger if exists sync_component_ingredient_quantity_columns
on public.component_ingredients;
create trigger sync_component_ingredient_quantity_columns
before insert or update on public.component_ingredients
for each row execute function public.sync_component_ingredient_quantity_columns();

alter table public.menus
    alter column price drop not null;

alter table public.ingredients
    add column if not exists updated_at timestamptz not null default now();
alter table public.components
    add column if not exists updated_at timestamptz not null default now();
alter table public.menus
    add column if not exists updated_at timestamptz not null default now();
alter table public.component_ingredients
    add column if not exists updated_at timestamptz not null default now();
alter table public.menu_components
    add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_ingredients_updated_at on public.ingredients;
create trigger set_ingredients_updated_at
before update on public.ingredients
for each row execute function public.handle_updated_at();

drop trigger if exists set_components_updated_at on public.components;
create trigger set_components_updated_at
before update on public.components
for each row execute function public.handle_updated_at();

drop trigger if exists set_menus_updated_at on public.menus;
create trigger set_menus_updated_at
before update on public.menus
for each row execute function public.handle_updated_at();

drop trigger if exists set_component_ingredients_updated_at on public.component_ingredients;
create trigger set_component_ingredients_updated_at
before update on public.component_ingredients
for each row execute function public.handle_updated_at();

drop trigger if exists set_menu_components_updated_at on public.menu_components;
create trigger set_menu_components_updated_at
before update on public.menu_components
for each row execute function public.handle_updated_at();

create or replace function public.touch_menu_from_tag_assignment()
returns trigger
language plpgsql
as $$
declare
    v_menu_id uuid;
begin
    v_menu_id := case when tg_op = 'DELETE' then old.menu_id else new.menu_id end;
    update public.menus
    set updated_at = now()
    where id = v_menu_id;
    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;

drop trigger if exists touch_menu_from_tag_assignment on public.menu_tag_assignments;
create trigger touch_menu_from_tag_assignment
after insert or update or delete on public.menu_tag_assignments
for each row execute function public.touch_menu_from_tag_assignment();

alter table public.components
    drop constraint if exists components_yield_servings_positive;
alter table public.components
    add constraint components_yield_servings_positive
    check (yield_servings > 0);

alter table public.component_ingredients
    drop constraint if exists component_ingredients_batch_quantity_positive;
alter table public.component_ingredients
    add constraint component_ingredients_batch_quantity_positive
    check (batch_quantity > 0);

alter table public.menu_components
    drop constraint if exists menu_components_qty_per_order_positive;
alter table public.menu_components
    add constraint menu_components_qty_per_order_positive
    check (qty_per_order > 0);

alter table public.menus
    drop constraint if exists menus_price_non_negative;
alter table public.menus
    add constraint menus_price_non_negative
    check (price is null or price >= 0);

do $$
begin
    if exists (
        select 1
        from public.vendors
        group by lower(btrim(name))
        having count(*) > 1
    ) then
        raise exception 'Cannot create normalized vendor-name index: duplicate vendor names exist';
    end if;
end $$;

create unique index if not exists vendors_name_unique_ci_idx
    on public.vendors (lower(btrim(name)));

create table public.kitchen_import_runs (
    id uuid primary key default gen_random_uuid(),
    restaurant_id text not null references public.restaurants(id) on delete cascade,
    actor_user_id uuid not null references public.users(id) on delete restrict,
    schema_version integer not null default 1 check (schema_version = 1),
    source_digest text not null,
    status text not null default 'previewed'
        check (status in ('previewed', 'applied', 'failed', 'expired')),
    created_at timestamptz not null default now(),
    previewed_at timestamptz not null default now(),
    expires_at timestamptz not null default (now() + interval '30 minutes'),
    applied_at timestamptz,
    operation_counts jsonb not null default '{}'::jsonb,
    issues jsonb not null default '[]'::jsonb,
    normalized_payload jsonb not null,
    before_snapshot jsonb not null default '{}'::jsonb,
    after_snapshot jsonb not null default '{}'::jsonb,
    temp_ref_mapping jsonb not null default '{}'::jsonb,
    error_summary text
);

create index kitchen_import_runs_restaurant_created_idx
    on public.kitchen_import_runs (restaurant_id, created_at desc);
create index kitchen_import_runs_actor_created_idx
    on public.kitchen_import_runs (actor_user_id, created_at desc);

alter table public.kitchen_import_runs enable row level security;

create policy "Can read kitchen import runs"
on public.kitchen_import_runs
for select
to authenticated
using (
    actor_user_id = (select auth.uid())
    and (
        (select app_private.can_access('kitchen', 'kitchen.update'))
        or (select app_private.can_access('menus', 'menus.update'))
    )
);

create policy "Can create kitchen import runs"
on public.kitchen_import_runs
for insert
to authenticated
with check (
    actor_user_id = (select auth.uid())
    and (
        (select app_private.can_access('kitchen', 'kitchen.update'))
        or (select app_private.can_access('menus', 'menus.update'))
    )
);

create policy "Can update kitchen import runs"
on public.kitchen_import_runs
for update
to authenticated
using (
    actor_user_id = (select auth.uid())
    and (
        (select app_private.can_access('kitchen', 'kitchen.update'))
        or (select app_private.can_access('menus', 'menus.update'))
    )
)
with check (
    actor_user_id = (select auth.uid())
    and (
        (select app_private.can_access('kitchen', 'kitchen.update'))
        or (select app_private.can_access('menus', 'menus.update'))
    )
);

create or replace function public.apply_kitchen_import(
    p_restaurant_id text,
    p_preview_id uuid,
    p_preview_digest text,
    p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
    v_run public.kitchen_import_runs%rowtype;
    v_operation jsonb;
    v_values jsonb;
    v_fields text[];
    v_temp_refs jsonb := '{}'::jsonb;
    v_ref text;
    v_resolved_id uuid;
    v_related_id uuid;
    v_existing_version timestamptz;
    v_counts jsonb := jsonb_build_object(
        'ingredients_created', 0,
        'ingredients_updated', 0,
        'components_created', 0,
        'components_updated', 0,
        'menus_created', 0,
        'menus_updated', 0,
        'component_ingredients_set', 0,
        'component_ingredients_removed', 0,
        'menu_components_set', 0,
        'menu_components_removed', 0
    );
begin
    select *
    into v_run
    from public.kitchen_import_runs
    where id = p_preview_id
      and restaurant_id = p_restaurant_id
      and actor_user_id = (select auth.uid())
    for update;

    if not found then
        raise exception 'Import preview not found';
    end if;
    if v_run.status <> 'previewed' then
        raise exception 'Import preview is no longer available';
    end if;
    if v_run.expires_at <= now() then
        update public.kitchen_import_runs
        set status = 'expired', error_summary = 'Preview expired before apply'
        where id = p_preview_id;
        raise exception 'Import preview has expired';
    end if;
    if v_run.source_digest <> p_preview_digest
       or v_run.normalized_payload <> p_payload then
        raise exception 'Import preview payload does not match';
    end if;

    if jsonb_array_length(coalesce(p_payload->'ingredients', '[]'::jsonb)) > 0
       or jsonb_array_length(coalesce(p_payload->'components', '[]'::jsonb)) > 0
       or jsonb_array_length(coalesce(p_payload->'component_ingredients', '[]'::jsonb)) > 0 then
        if not (select public.can_access('kitchen', 'kitchen.update')) then
            raise exception 'Missing kitchen.update permission';
        end if;
    end if;

    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_payload->'menus', '[]'::jsonb)) op
        where op->>'action' = 'create'
    ) and not (select public.can_access('menus', 'menus.create')) then
        raise exception 'Missing menus.create permission';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(coalesce(p_payload->'menus', '[]'::jsonb)) op
        where op->>'action' = 'update'
           or (
               op->>'action' = 'create'
               and jsonb_array_length(coalesce(op->'tag_ids', '[]'::jsonb)) > 0
           )
    ) or jsonb_array_length(coalesce(p_payload->'menu_components', '[]'::jsonb)) > 0 then
        if not (select public.can_access('menus', 'menus.update')) then
            raise exception 'Missing menus.update permission';
        end if;
    end if;

    for v_operation in
        select value from jsonb_array_elements(coalesce(p_payload->'ingredients', '[]'::jsonb))
    loop
        v_ref := v_operation->>'ref';
        v_values := v_operation->'values';
        if v_operation->>'action' = 'create' then
            insert into public.ingredients (
                name, unit, category, vendor_id, package_size, package_label
            ) values (
                v_values->>'name',
                coalesce(v_values->>'unit', ''),
                nullif(v_values->>'category', ''),
                nullif(v_values->>'vendor_id', '')::uuid,
                nullif(v_values->>'package_size', '')::numeric,
                nullif(v_values->>'package_label', '')
            )
            returning id into v_resolved_id;
            v_temp_refs := v_temp_refs || jsonb_build_object(v_ref, v_resolved_id);
            v_counts := jsonb_set(v_counts, '{ingredients_created}', to_jsonb((v_counts->>'ingredients_created')::integer + 1));
        else
            select updated_at into v_existing_version
            from public.ingredients
            where id = v_ref::uuid
            for update;
            if not found or v_existing_version <> (v_operation->>'version')::timestamptz then
                raise exception 'Ingredient % changed after preview', v_ref;
            end if;
            v_fields := array(select jsonb_array_elements_text(v_operation->'update_fields'));
            update public.ingredients set
                name = case when 'name' = any(v_fields) then v_values->>'name' else name end,
                unit = case when 'unit' = any(v_fields) then coalesce(v_values->>'unit', '') else unit end,
                category = case when 'category' = any(v_fields) then nullif(v_values->>'category', '') else category end,
                vendor_id = case when 'vendor' = any(v_fields) then nullif(v_values->>'vendor_id', '')::uuid else vendor_id end,
                package_size = case when 'package_size' = any(v_fields) then nullif(v_values->>'package_size', '')::numeric else package_size end,
                package_label = case when 'package_label' = any(v_fields) then nullif(v_values->>'package_label', '') else package_label end
            where id = v_ref::uuid;
            v_counts := jsonb_set(v_counts, '{ingredients_updated}', to_jsonb((v_counts->>'ingredients_updated')::integer + 1));
        end if;
    end loop;

    for v_operation in
        select value from jsonb_array_elements(coalesce(p_payload->'components', '[]'::jsonb))
    loop
        v_ref := v_operation->>'ref';
        v_values := v_operation->'values';
        if v_operation->>'action' = 'create' then
            insert into public.components (restaurant_id, name, description, yield_servings)
            values (
                p_restaurant_id,
                v_values->>'name',
                nullif(v_values->>'description', ''),
                (v_values->>'yield_servings')::integer
            )
            returning id into v_resolved_id;
            v_temp_refs := v_temp_refs || jsonb_build_object(v_ref, v_resolved_id);
            v_counts := jsonb_set(v_counts, '{components_created}', to_jsonb((v_counts->>'components_created')::integer + 1));
        else
            select updated_at into v_existing_version
            from public.components
            where id = v_ref::uuid and restaurant_id = p_restaurant_id
            for update;
            if not found or v_existing_version <> (v_operation->>'version')::timestamptz then
                raise exception 'Component % changed after preview', v_ref;
            end if;
            v_fields := array(select jsonb_array_elements_text(v_operation->'update_fields'));
            update public.components set
                name = case when 'name' = any(v_fields) then v_values->>'name' else name end,
                description = case when 'description' = any(v_fields) then nullif(v_values->>'description', '') else description end,
                yield_servings = case when 'yield_servings' = any(v_fields) then (v_values->>'yield_servings')::integer else yield_servings end
            where id = v_ref::uuid and restaurant_id = p_restaurant_id;
            v_counts := jsonb_set(v_counts, '{components_updated}', to_jsonb((v_counts->>'components_updated')::integer + 1));
        end if;
    end loop;

    for v_operation in
        select value from jsonb_array_elements(coalesce(p_payload->'menus', '[]'::jsonb))
    loop
        v_ref := v_operation->>'ref';
        v_values := v_operation->'values';
        if v_operation->>'action' = 'create' then
            insert into public.menus (
                restaurant_id, name, name_en, price, description, staff_memo, color, is_public
            ) values (
                p_restaurant_id,
                v_values->>'name',
                nullif(v_values->>'name_en', ''),
                nullif(v_values->>'price', '')::integer,
                nullif(v_values->>'description', ''),
                nullif(v_values->>'staff_memo', ''),
                nullif(v_values->>'color', ''),
                coalesce((v_values->>'is_public')::boolean, true)
            )
            returning id into v_resolved_id;
            v_temp_refs := v_temp_refs || jsonb_build_object(v_ref, v_resolved_id);
            v_fields := case
                when jsonb_array_length(coalesce(v_operation->'tag_ids', '[]'::jsonb)) > 0
                    then array['tag_labels_json']
                else array[]::text[]
            end;
            v_counts := jsonb_set(v_counts, '{menus_created}', to_jsonb((v_counts->>'menus_created')::integer + 1));
        else
            v_resolved_id := v_ref::uuid;
            select updated_at into v_existing_version
            from public.menus
            where id = v_resolved_id and restaurant_id = p_restaurant_id
            for update;
            if not found or v_existing_version <> (v_operation->>'version')::timestamptz then
                raise exception 'Menu % changed after preview', v_ref;
            end if;
            v_fields := array(select jsonb_array_elements_text(v_operation->'update_fields'));
            update public.menus set
                name = case when 'name' = any(v_fields) then v_values->>'name' else name end,
                name_en = case when 'name_en' = any(v_fields) then nullif(v_values->>'name_en', '') else name_en end,
                price = case when 'price' = any(v_fields) then nullif(v_values->>'price', '')::integer else price end,
                description = case when 'description' = any(v_fields) then nullif(v_values->>'description', '') else description end,
                staff_memo = case when 'staff_memo' = any(v_fields) then nullif(v_values->>'staff_memo', '') else staff_memo end,
                color = case when 'color' = any(v_fields) then nullif(v_values->>'color', '') else color end,
                is_public = case when 'is_public' = any(v_fields) then (v_values->>'is_public')::boolean else is_public end
            where id = v_resolved_id and restaurant_id = p_restaurant_id;
            v_counts := jsonb_set(v_counts, '{menus_updated}', to_jsonb((v_counts->>'menus_updated')::integer + 1));
        end if;

        if 'tag_labels_json' = any(v_fields) then
            delete from public.menu_tag_assignments where menu_id = v_resolved_id;
            insert into public.menu_tag_assignments (menu_id, tag_id)
            select v_resolved_id, value::uuid
            from jsonb_array_elements_text(coalesce(v_operation->'tag_ids', '[]'::jsonb));
        end if;
    end loop;

    for v_operation in
        select value from jsonb_array_elements(coalesce(p_payload->'component_ingredients', '[]'::jsonb))
    loop
        v_ref := v_operation->>'component_ref';
        v_resolved_id := case
            when v_ref like 'new:%' then (v_temp_refs->>v_ref)::uuid
            else v_ref::uuid
        end;
        v_ref := v_operation->>'ingredient_ref';
        v_related_id := case
            when v_ref like 'new:%' then (v_temp_refs->>v_ref)::uuid
            else v_ref::uuid
        end;

        if not exists (
            select 1 from public.components
            where id = v_resolved_id and restaurant_id = p_restaurant_id
        ) or not exists (
            select 1 from public.ingredients where id = v_related_id
        ) then
            raise exception 'Invalid component ingredient relationship';
        end if;

        if v_operation->>'action' = 'remove' then
            if nullif(v_operation->>'relationship_version', '') is not null then
                select updated_at into v_existing_version
                from public.component_ingredients
                where component_id = v_resolved_id and ingredient_id = v_related_id
                for update;
                if not found or v_existing_version <> (v_operation->>'relationship_version')::timestamptz then
                    raise exception 'Component ingredient relationship changed after preview';
                end if;
            end if;
            delete from public.component_ingredients
            where component_id = v_resolved_id and ingredient_id = v_related_id;
            v_counts := jsonb_set(v_counts, '{component_ingredients_removed}', to_jsonb((v_counts->>'component_ingredients_removed')::integer + 1));
        else
            if nullif(v_operation->>'relationship_version', '') is not null then
                select updated_at into v_existing_version
                from public.component_ingredients
                where component_id = v_resolved_id and ingredient_id = v_related_id
                for update;
                if not found or v_existing_version <> (v_operation->>'relationship_version')::timestamptz then
                    raise exception 'Component ingredient relationship changed after preview';
                end if;
            elsif exists (
                select 1 from public.component_ingredients
                where component_id = v_resolved_id and ingredient_id = v_related_id
            ) then
                raise exception 'Component ingredient relationship was created after preview';
            end if;
            insert into public.component_ingredients (component_id, ingredient_id, batch_quantity)
            values (v_resolved_id, v_related_id, (v_operation->>'batch_quantity')::numeric)
            on conflict (component_id, ingredient_id)
            do update set batch_quantity = excluded.batch_quantity;
            v_counts := jsonb_set(v_counts, '{component_ingredients_set}', to_jsonb((v_counts->>'component_ingredients_set')::integer + 1));
        end if;
    end loop;

    for v_operation in
        select value from jsonb_array_elements(coalesce(p_payload->'menu_components', '[]'::jsonb))
    loop
        v_ref := v_operation->>'menu_ref';
        v_resolved_id := case
            when v_ref like 'new:%' then (v_temp_refs->>v_ref)::uuid
            else v_ref::uuid
        end;
        v_ref := v_operation->>'component_ref';
        v_related_id := case
            when v_ref like 'new:%' then (v_temp_refs->>v_ref)::uuid
            else v_ref::uuid
        end;

        if not exists (
            select 1 from public.menus
            where id = v_resolved_id and restaurant_id = p_restaurant_id
        ) or not exists (
            select 1 from public.components
            where id = v_related_id and restaurant_id = p_restaurant_id
        ) then
            raise exception 'Invalid menu component relationship';
        end if;

        if v_operation->>'action' = 'remove' then
            if nullif(v_operation->>'relationship_version', '') is not null then
                select updated_at into v_existing_version
                from public.menu_components
                where menu_id = v_resolved_id and component_id = v_related_id
                for update;
                if not found or v_existing_version <> (v_operation->>'relationship_version')::timestamptz then
                    raise exception 'Menu component relationship changed after preview';
                end if;
            end if;
            delete from public.menu_components
            where menu_id = v_resolved_id and component_id = v_related_id;
            v_counts := jsonb_set(v_counts, '{menu_components_removed}', to_jsonb((v_counts->>'menu_components_removed')::integer + 1));
        else
            if nullif(v_operation->>'relationship_version', '') is not null then
                select updated_at into v_existing_version
                from public.menu_components
                where menu_id = v_resolved_id and component_id = v_related_id
                for update;
                if not found or v_existing_version <> (v_operation->>'relationship_version')::timestamptz then
                    raise exception 'Menu component relationship changed after preview';
                end if;
            elsif exists (
                select 1 from public.menu_components
                where menu_id = v_resolved_id and component_id = v_related_id
            ) then
                raise exception 'Menu component relationship was created after preview';
            end if;
            insert into public.menu_components (menu_id, component_id, qty_per_order)
            values (v_resolved_id, v_related_id, (v_operation->>'quantity_per_menu_order')::numeric)
            on conflict (menu_id, component_id)
            do update set qty_per_order = excluded.qty_per_order;
            v_counts := jsonb_set(v_counts, '{menu_components_set}', to_jsonb((v_counts->>'menu_components_set')::integer + 1));
        end if;
    end loop;

    update public.kitchen_import_runs
    set status = 'applied',
        applied_at = now(),
        operation_counts = v_counts,
        temp_ref_mapping = v_temp_refs,
        error_summary = null
    where id = p_preview_id;

    return jsonb_build_object(
        'success', true,
        'run_id', p_preview_id,
        'counts', v_counts,
        'temp_ref_mapping', v_temp_refs
    );
exception
    when others then
        raise;
end;
$$;

revoke all on function public.apply_kitchen_import(text, uuid, text, jsonb) from public;
grant execute on function public.apply_kitchen_import(text, uuid, text, jsonb) to authenticated;
