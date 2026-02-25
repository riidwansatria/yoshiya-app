'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { DailyOrder } from '../queries/daily-orders';

export async function saveDailyOrders(
    restaurantId: string,
    targetDate: string,
    orders: { menu_id: string; quantity: number; notes?: string }[]
) {
    const supabase = await createClient();

    // First, delete existing orders for this specific date and restaurant
    // This allows the paste action to be simply "overwrite the day"
    const { error: deleteError } = await supabase
        .from('daily_orders')
        .delete()
        .eq('restaurant_id', restaurantId)
        .eq('target_date', targetDate);

    if (deleteError) {
        console.error('Error clearing old daily orders:', deleteError);
        return { error: `Failed to clear previous orders: ${deleteError.message}` };
    }

    // Insert the new orders
    if (orders.length > 0) {
        const insertData = orders.map(order => ({
            restaurant_id: restaurantId,
            target_date: targetDate,
            menu_id: order.menu_id,
            quantity: order.quantity,
            notes: order.notes || null
        }));

        const { error: insertError } = await supabase
            .from('daily_orders')
            .insert(insertData);

        if (insertError) {
            console.error('Error inserting daily orders:', insertError);
            return { error: `Failed to save daily orders: ${insertError.message}` };
        }
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/kitchen/orders', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/kitchen/summary', 'page');
    return { success: true };
}
