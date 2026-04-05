import { createClient } from '@/lib/supabase/server';
import { fetchMenuTags as fetchKitchenMenuTags } from './kitchen';

export interface MenuTag {
    id: string;
    restaurant_id: string;
    label: string;
    created_at: string | null;
    updated_at: string | null;
}

export async function getMenuTags(restaurantId: string): Promise<MenuTag[]> {
    const supabase = await createClient();
    return fetchKitchenMenuTags(supabase, restaurantId);
}
