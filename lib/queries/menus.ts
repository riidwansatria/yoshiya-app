import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';
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

export const getMenus = unstable_cache(
    async (restaurantId: string, options?: GetMenusOptions): Promise<Menu[]> => {
        const supabase = createCacheClient();
        return fetchKitchenMenus(supabase, restaurantId, options);
    },
    ['menus'],
    { tags: ['menus'], revalidate: 3600 }
);

export const getMenuById = unstable_cache(
    async (id: string): Promise<Menu | null> => {
        const supabase = createCacheClient();
        return fetchKitchenMenuById(supabase, id);
    },
    ['menu-by-id'],
    { tags: ['menus'], revalidate: 3600 }
);
