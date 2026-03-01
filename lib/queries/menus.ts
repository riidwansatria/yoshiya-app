import { createClient } from '@/lib/supabase/server';

export interface MenuComponentReference {
    id: string;
    name: string;
}

export interface Menu {
    id: string;
    restaurant_id: string;
    name: string;
    season: string | null;
    price: number | null;
    description: string | null;
    color: string | null;
    created_at: string;
    menu_components?: MenuComponent[];
}

export interface MenuComponent {
    menu_id: string;
    component_id: string;
    qty_per_order: number;
    components?: MenuComponentReference | null;
}

interface GetMenusOptions {
    includeMenuComponents?: boolean;
    includeComponentDetails?: boolean;
}

function buildMenusSelect({
    includeMenuComponents = false,
    includeComponentDetails = false,
}: GetMenusOptions = {}) {
    const baseSelect = 'id, restaurant_id, name, season, price, description, color, created_at';

    if (!includeMenuComponents) {
        return baseSelect;
    }

    const componentSelect = includeComponentDetails ? ', components (id, name)' : '';
    return `${baseSelect}, menu_components (menu_id, component_id, qty_per_order${componentSelect})`;
}

export async function getMenus(
    restaurantId: string,
    options?: GetMenusOptions
): Promise<Menu[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menus')
        .select(buildMenusSelect(options))
        .eq('restaurant_id', restaurantId)
        .order('name');

    if (error) {
        console.error('Error fetching menus:', error);
        return [];
    }

    return (data ?? []) as unknown as Menu[];
}

export async function getMenuById(id: string): Promise<Menu | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menus')
        .select(buildMenusSelect({ includeMenuComponents: true }))
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching menu by ID:', error);
        return null;
    }

    return data as unknown as Menu;
}
