import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export const getKitchenImportOverview = cache(async (restaurantId: string) => {
    const supabase = await createClient();
    const [
        restaurant,
        ingredients,
        components,
        menus,
        componentIngredients,
        menuComponents,
    ] = await Promise.all([
        supabase.from('restaurants').select('id, name').eq('id', restaurantId).maybeSingle(),
        supabase.from('ingredients').select('id', { count: 'exact', head: true }),
        supabase.from('components').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase.from('menus').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId),
        supabase
            .from('component_ingredients')
            .select('component_id, components!inner(restaurant_id)', { count: 'exact', head: true })
            .eq('components.restaurant_id', restaurantId),
        supabase
            .from('menu_components')
            .select('menu_id, menus!inner(restaurant_id)', { count: 'exact', head: true })
            .eq('menus.restaurant_id', restaurantId),
    ]);

    const error = [
        restaurant.error,
        ingredients.error,
        components.error,
        menus.error,
        componentIngredients.error,
        menuComponents.error,
    ].find(Boolean);
    if (error) {
        throw new Error(error.message);
    }
    if (!restaurant.data) {
        return null;
    }

    return {
        restaurant: restaurant.data,
        counts: {
            ingredients: ingredients.count ?? 0,
            components: components.count ?? 0,
            menus: menus.count ?? 0,
            componentIngredients: componentIngredients.count ?? 0,
            menuComponents: menuComponents.count ?? 0,
        },
    };
});
