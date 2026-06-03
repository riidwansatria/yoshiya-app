import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export interface Restaurant {
    id: string;
    name: string;
    icon: string | null;
    prefix: string | null;
}

export const getRestaurants = cache(
    async (): Promise<Restaurant[]> => {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('restaurants')
            .select('id, name, icon, prefix')
            .order('name', { ascending: true });

        if (error) {
            console.error('[getRestaurants] Failed to load restaurants', error);
            return [];
        }

        return (data ?? []) as Restaurant[];
    }
);

export function getRestaurantById(restaurants: Restaurant[], restaurantId: string | null) {
    if (!restaurantId) return null;
    return restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
}
