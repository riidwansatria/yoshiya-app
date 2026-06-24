do $migration$
declare
    expected_relationships constant integer := 38;
    inserted_relationships integer;
begin
    if exists (
        select 1
        from public.menus m
        where m.restaurant_id = 'enkaijou'
          and m.name in (
              '47 | すき焼き風豆腐鍋 花暦 デザート付',
              '49 | 天婦羅・うどん入豆腐鍋 花暦 デザート付',
              '51 | 鶏唐入り豆腐鍋 花暦 デザート付',
              '55 | 天ぷら 花暦 デザート付',
              '57 | 国産鰻せいろ御飯 花暦 デザート付',
              '69 | 特別会席',
              '71 | Halal 鶏唐入り豆腐鍋 花暦 デザート付',
              '74 | Halal 天ぷら 花暦 デザート付'
          )
          and exists (
              select 1
              from public.menu_components mc
              where mc.menu_id = m.id
          )
    ) then
        raise exception 'A target November menu already has components';
    end if;

    with source_pairs(target_name, source_name) as (
        values
            ('47 | すき焼き風豆腐鍋 花暦 デザート付', '46 | すき焼き風豆腐鍋 花暦'),
            ('49 | 天婦羅・うどん入豆腐鍋 花暦 デザート付', '48 | 天婦羅・うどん入豆腐鍋 花暦'),
            ('51 | 鶏唐入り豆腐鍋 花暦 デザート付', '50 | 鶏唐入り豆腐鍋 花暦'),
            ('55 | 天ぷら 花暦 デザート付', '54 | 天ぷら 花暦'),
            ('57 | 国産鰻せいろ御飯 花暦 デザート付', '56 | 国産鰻せいろ御飯 花暦'),
            ('71 | Halal 鶏唐入り豆腐鍋 花暦 デザート付', '70 | Halal 鶏唐入り豆腐鍋 花暦'),
            ('74 | Halal 天ぷら 花暦 デザート付', '83 | Halal 天ぷら 花暦')
    ),
    proposed(target_name, component_name, quantity) as (
        select pairs.target_name, component.name, relationship.qty_per_order
        from source_pairs pairs
        join public.menus source_menu
          on source_menu.restaurant_id = 'enkaijou'
         and source_menu.name = pairs.source_name
        join public.menu_components relationship
          on relationship.menu_id = source_menu.id
        join public.components component
          on component.id = relationship.component_id

        union all

        select pairs.target_name, '季節のデザート', 1::numeric
        from source_pairs pairs

        union all

        select '69 | 特別会席', component_name, 1::numeric
        from (
            values
                ('八寸'),
                ('向付'),
                ('焼物'),
                ('鍋物'),
                ('油物'),
                ('御飯（国産米）'),
                ('香物'),
                ('赤出汁'),
                ('水物')
        ) kaiseki(component_name)
    )
    insert into public.menu_components (menu_id, component_id, qty_per_order)
    select target_menu.id, component.id, proposed.quantity
    from proposed
    join public.menus target_menu
      on target_menu.restaurant_id = 'enkaijou'
     and target_menu.name = proposed.target_name
    join public.components component
      on component.restaurant_id = 'enkaijou'
     and component.name = proposed.component_name;

    get diagnostics inserted_relationships = row_count;

    if inserted_relationships <> expected_relationships then
        raise exception
            'Expected to insert % menu-component relationships, inserted %',
            expected_relationships,
            inserted_relationships;
    end if;
end;
$migration$;
