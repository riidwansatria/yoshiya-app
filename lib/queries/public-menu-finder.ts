import { createCacheClient } from '@/lib/supabase/cache';
import type { Menu, MenuTag } from '@/lib/types/kitchen';
import { compareMenuNames } from '@/lib/utils/menu-number';

type PublicMenuFinderRow = Omit<Menu, 'staff_memo' | 'menu_components' | 'tags'> & {
    tags: MenuTag[] | null;
};

export async function getPublicMenuFinderItems(restaurantId: string): Promise<Menu[]> {
    const supabase = createCacheClient();
    const { data, error } = await supabase.rpc('get_public_menu_finder_items', {
        required_restaurant_id: restaurantId,
    });

    if (error) {
        console.error('[getPublicMenuFinderItems] Failed to load public menus', error);
        return [];
    }

    return ((data ?? []) as PublicMenuFinderRow[])
        .map((row) => ({
            ...row,
            staff_memo: null,
            tags: Array.isArray(row.tags) ? row.tags : [],
        }))
        .sort(compareMenuNames);
}
