import { createClient } from '@/lib/supabase/server';
import { RecipeComponent } from './components';

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
    components?: RecipeComponent;
}

export async function getMenus(restaurantId: string): Promise<Menu[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menus')
        .select(`
            *,
            menu_components (
                menu_id,
                component_id,
                qty_per_order,
                components (*)
            )
        `)
        .eq('restaurant_id', restaurantId)
        .order('name');

    if (error) {
        console.error('Error fetching menus:', error);
        return [];
    }

    return data as Menu[];
}

export async function getMenuById(id: string): Promise<Menu | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('menus')
        .select(`
            *,
            menu_components (
                menu_id,
                component_id,
                qty_per_order,
                components (*)
            )
        `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('Error fetching menu by ID:', error);
        return null;
    }

    return data as Menu;
}
