import { createClient } from '@/lib/supabase/server';

export interface AggregatedComponent {
    component_id: string;
    name: string;
    total_quantity: number;
    yield_servings: number;
    description: string | null;
}

export async function getComponentsSummary(
    restaurantId: string,
    targetDate: string
): Promise<AggregatedComponent[]> {
    const supabase = await createClient();

    // 1. Get daily orders for the date
    const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('menu_id, quantity')
        .eq('restaurant_id', restaurantId)
        .eq('target_date', targetDate);

    if (ordersError || !orders || orders.length === 0) return [];

    const menuIds = Array.from(new Set(orders.map((o) => o.menu_id)));

    // 2. Get menus with their mapped components
    const { data: menus, error: menusError } = await supabase
        .from('menus')
        .select(`
            id,
            menu_components (
                qty_per_order,
                components (
                    id,
                    name,
                    yield_servings,
                    description
                )
            )
        `)
        .in('id', menuIds);

    if (menusError || !menus) {
        console.error('Error fetching menu components:', menusError);
        return [];
    }

    // 3. Aggregate total component quantities
    const aggregatedMap = new Map<string, AggregatedComponent>();

    for (const order of orders) {
        const menu = menus.find((m) => m.id === order.menu_id);
        if (!menu || !menu.menu_components) continue;

        for (const mc of menu.menu_components) {
            const component = mc.components as any;
            if (!component) continue;

            const totalNeeded = order.quantity * mc.qty_per_order;

            if (aggregatedMap.has(component.id)) {
                aggregatedMap.get(component.id)!.total_quantity += totalNeeded;
            } else {
                aggregatedMap.set(component.id, {
                    component_id: component.id,
                    name: component.name,
                    total_quantity: totalNeeded,
                    yield_servings: component.yield_servings,
                    description: component.description ?? null,
                });
            }
        }
    }

    // 4. Sort alphabetically and return as array
    return Array.from(aggregatedMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
    );
}
