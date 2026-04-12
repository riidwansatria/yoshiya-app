import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export const getVenues = unstable_cache(
    async (restaurantId: string) => {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

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

export const getVenuesWithConcurrent = async (restaurantId: string) => {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

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