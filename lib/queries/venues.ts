import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export const getVenues = cache(
    async (restaurantId: string) => {
        const supabase = await createClient();

        const { data, error } = await supabase
            .from('venues')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .order('name');

        if (error) {
            console.error('Error fetching venues:', error);
            return [];
        }

        return data;
    }
);

export const getVenuesWithConcurrent = async (restaurantId: string) => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

    if (error) {
        console.error('Error fetching venues:', error);
        return [];
    }

    const venuesWithRows: (typeof data[number] & { rowIndex: number })[] = []
    
    data.forEach((venue: typeof data[number]) => {
        const concurrent = venue.concurrent_groups ?? 1
        for (let i = 0; i < concurrent; i++) {
            venuesWithRows.push({ ...venue, rowIndex: i })
        }
    })

    return venuesWithRows;
};
