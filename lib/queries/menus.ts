import { createClient } from '@/lib/supabase/server';

export async function getMenus(restaurantId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menus')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('name');

    if (error) {
        console.error('Error fetching menus:', error);
        return [];
    }

    return data;
}
