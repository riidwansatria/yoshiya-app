import { createClient } from '@/lib/supabase/server';

export interface AggregatedMenu {
    menu_id: string;
    name: string;
    total_quantity: number;
}

export async function getMenusSummary(
    restaurantId: string,
    startDate: string,
    endDate: string = startDate
): Promise<AggregatedMenu[]> {
    const supabase = await createClient();

    const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('menu_id, quantity')
        .eq('restaurant_id', restaurantId)
        .gte('target_date', startDate)
        .lte('target_date', endDate);

    if (ordersError || !orders || orders.length === 0) return [];

    const menuIds = Array.from(new Set(orders.map((o) => o.menu_id)));

    const { data: menus, error: menusError } = await supabase
        .from('menus')
        .select('id, name')
        .in('id', menuIds);

    if (menusError || !menus) {
        console.error('Error fetching menus:', menusError);
        return [];
    }

    const aggregatedMap = new Map<string, AggregatedMenu>();

    for (const order of orders) {
        const menu = menus.find((m) => m.id === order.menu_id);
        if (!menu) continue;

        if (aggregatedMap.has(menu.id)) {
            aggregatedMap.get(menu.id)!.total_quantity += order.quantity;
        } else {
            aggregatedMap.set(menu.id, {
                menu_id: menu.id,
                name: menu.name,
                total_quantity: order.quantity,
            });
        }
    }

    return Array.from(aggregatedMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
}