import { createCacheClient } from '@/lib/supabase/cache';
import type { Menu, MenuTag } from '@/lib/types/kitchen';

type PublicMenuFinderRow = Omit<Menu, 'staff_memo' | 'menu_components' | 'tags'> & {
    tags: MenuTag[] | null;
};

const CIRCLED_NUMBERS = [
    ...Array.from({ length: 20 }, (_, i) => String.fromCodePoint(0x2460 + i)),
    ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x3251 + i)),
    ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x32b1 + i)),
];

function circledNumberIndex(name: string): number {
    const idx = CIRCLED_NUMBERS.findIndex((c) => name.startsWith(c));
    return idx === -1 ? Infinity : idx;
}

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
        .sort((a, b) => circledNumberIndex(a.name) - circledNumberIndex(b.name));
}
