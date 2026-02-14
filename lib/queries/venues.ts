import { createClient } from '@/lib/supabase/server';

export async function getVenues(restaurantId: string) {
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
