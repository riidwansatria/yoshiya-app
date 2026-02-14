import { createClient } from '@/lib/supabase/server';

export async function getReservations(restaurantId: string, options?: { date?: string; limit?: number }) {
    const supabase = await createClient();

    let query = supabase
        .from('reservations')
        .select(`
      *,
      venues ( name, capacity ),
      reservation_menus ( id, menu_name, quantity, unit_price, notes ),
      reservation_staff ( id, user_id, temp_name, role, duration_minutes, users ( name ) ),
      customers ( name )
    `)
        .eq('restaurant_id', restaurantId)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

    if (options?.date) {
        query = query.eq('date', options.date);
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching reservations:', error);
        return [];
    }

    return data;
}

export async function getReservationById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('reservations')
        .select(`
      *,
      venues ( name, capacity ),
      reservation_menus ( id, menu_name, quantity, unit_price, notes ),
      reservation_staff ( id, user_id, temp_name, role, duration_minutes, users ( name ) ),
      customers ( name )
    `)
        .eq('id', id)
        .single();

    if (error) {
        console.error(`Error fetching reservation ${id}:`, error);
        return null;
    }

    return data;
}
