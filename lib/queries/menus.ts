import { createClient } from '@/lib/supabase/server';
import type { MenuTag } from './menu-tags';
import {
    fetchMenuById as fetchKitchenMenuById,
    fetchMenus as fetchKitchenMenus,
} from './kitchen';

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
    menu_components?: MenuComponent[];
    tags?: MenuTag[];
}

export interface MenuComponent {
    menu_id: string;
    component_id: string;
    qty_per_order: number;
    components?: MenuComponentReference | null;
}

export interface GetMenusOptions {
    includeMenuComponents?: boolean;
    includeComponentDetails?: boolean;
    includeTags?: boolean;
}

export async function getMenus(
    restaurantId: string,
    options?: GetMenusOptions
): Promise<Menu[]> {
    const supabase = await createClient();
    return fetchKitchenMenus(supabase, restaurantId, options);
}

export async function getMenuById(id: string): Promise<Menu | null> {
    const supabase = await createClient();
    return fetchKitchenMenuById(supabase, id);
}
