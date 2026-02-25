

export interface AggregatedIngredient {
    ingredient_id: string;
    name: string;
    unit: string;
    category: string;
    total_quantity: number;
}

export async function getIngredientsSummary(restaurantId: string, targetDate: string): Promise<Record<string, AggregatedIngredient[]>> {
    const supabase = await createClient();

    // 1. Get daily orders for the date
    const { data: orders, error: ordersError } = await supabase
        .from('daily_orders')
        .select('menu_id, quantity')
        .eq('restaurant_id', restaurantId)
        .eq('target_date', targetDate);

    if (ordersError || !orders || orders.length === 0) {
        return {};
    }

    const menuIds = Array.from(new Set(orders.map((o) => o.menu_id)));

    // 2. Get menus with their components and those components' ingredients
    const { data: menus, error: menusError } = await supabase
        .from('menus')
        .select(`
      id,
      menu_components (
        qty_per_order,
        components (
          id,
          yield_servings,
          component_ingredients (
            qty_per_serving,
            ingredients (
              id,
              name,
              unit,
              category
            )
          )
        )
      )
    `)
        .in('id', menuIds);

    if (menusError || !menus) {
        console.error('Error fetching nested menu data:', menusError);
        return {};
    }

    interface RawIngredientObj {
        id: string;
        name: string;
        unit: string;
        category: string | null;
    }

    const aggregatedMap = new Map<string, AggregatedIngredient>();

    // 3. Aggregate
    for (const order of orders) {
        const menu = menus.find((m) => m.id === order.menu_id);
        if (!menu || !menu.menu_components) continue;

        for (const mc of menu.menu_components) {
            const component = mc.components;
            if (!component || !component.component_ingredients) continue;

            const compYield = component.yield_servings || 1;
            // How much of this component is needed for one SINGLE order of the menu?
            const compQtyPerOrder = mc.qty_per_order;

            // Total component quantity needed across ALL orders of this menu
            const totalComponentNeeded = order.quantity * compQtyPerOrder;

            for (const ci of component.component_ingredients) {
                const ingredient = ci.ingredients as unknown as RawIngredientObj;
                if (!ingredient) continue;

                // Rule: qty_per_serving in `component_ingredients` represents the amount 
                // needed to produce ONE serving based on `yield_servings`.
                // This formula assumes `compQtyPerOrder` is expressed in the same "servings/units"
                // metric as `yield_servings`.
                // Amount per comp unit = ci.qty_per_serving / compYield
                // Or simpler: The total amount = (ci.qty_per_serving / compYield) * totalComponentNeeded
                const ingredientAmount = (ci.qty_per_serving / compYield) * totalComponentNeeded;

                if (aggregatedMap.has(ingredient.id)) {
                    aggregatedMap.get(ingredient.id)!.total_quantity += ingredientAmount;
                } else {
                    aggregatedMap.set(ingredient.id, {
                        ingredient_id: ingredient.id,
                        name: ingredient.name,
                        unit: ingredient.unit,
                        category: ingredient.category || 'Uncategorized',
                        total_quantity: ingredientAmount
                    });
                }
            }
        }
    }

    // 4. Group by category
    const grouped: Record<string, AggregatedIngredient[]> = {};

    for (const item of aggregatedMap.values()) {
        // Round to 2 decimal places to avoid floating point weirdness
        item.total_quantity = Math.round(item.total_quantity * 100) / 100;

        if (!grouped[item.category]) {
            grouped[item.category] = [];
        }
        grouped[item.category].push(item);
    }

    // Sort alphabetically within categories
    for (const cat in grouped) {
        grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    }

    return grouped;
}
