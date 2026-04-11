import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';
import type { Menu } from '@/lib/types/kitchen';
import {
    fetchMenuById as fetchKitchenMenuById,
    fetchMenus as fetchKitchenMenus,
} from './kitchen';

export type {
    Menu,
    MenuComponent,
    MenuComponentReference,
} from '@/lib/types/kitchen';

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
