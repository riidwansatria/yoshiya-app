-- Performance indexes for menu management query patterns
create index if not exists menus_restaurant_name_idx
    on public.menus (restaurant_id, name);

create index if not exists components_restaurant_name_idx
    on public.components (restaurant_id, name);

create index if not exists menu_components_component_id_idx
    on public.menu_components (component_id);

-- Data integrity checks to prevent invalid quantities
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'menu_components_qty_per_order_positive'
    ) THEN
        ALTER TABLE public.menu_components
            ADD CONSTRAINT menu_components_qty_per_order_positive
            CHECK (qty_per_order > 0);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'components_yield_servings_positive'
    ) THEN
        ALTER TABLE public.components
            ADD CONSTRAINT components_yield_servings_positive
            CHECK (yield_servings > 0);
    END IF;
END $$;
