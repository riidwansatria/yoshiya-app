import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
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

export const getMenus = cache(
    async (restaurantId: string, options?: GetMenusOptions): Promise<Menu[]> => {
        const supabase = await createClient();
        return fetchKitchenMenus(supabase, restaurantId, options);
    }
);

export const getMenuById = cache(
    async (id: string): Promise<Menu | null> => {
        const supabase = await createClient();
        return fetchKitchenMenuById(supabase, id);
    }
);
