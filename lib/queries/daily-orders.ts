import { createClient } from '@/lib/supabase/server';
import type { DailyOrder } from '@/lib/types/kitchen';

export type { DailyOrder } from '@/lib/types/kitchen';

export async function getDailyOrders(restaurantId: string, targetDate: string): Promise<DailyOrder[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('daily_orders')
        .select(`
            *,
            menu:menus (*)
        `)
        .eq('restaurant_id', restaurantId)
        .eq('target_date', targetDate);

    if (error) {
        console.error('Error fetching daily orders:', error);
        return [];
    }

    // Map `menu` relation to `menus` property to match expected typing if needed, 
    // but we aliased it as `menu:menus` in the query so it returns as `menu`.
    return data as DailyOrder[];
}
