import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';

export const getVenues = unstable_cache(
    async (restaurantId: string) => {
        const supabase = createCacheClient();

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
    },
    ['venues'],
    { tags: ['venues'], revalidate: 3600 }
);
