import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';
import { fetchIngredientById as fetchKitchenIngredientById, fetchIngredients as fetchKitchenIngredients, fetchDistinctStores as fetchKitchenDistinctStores } from './kitchen';

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    category: string | null;
    store: string | null;
    package_size: number | null;
    package_label: string | null;
    created_at: string;
}

export const getIngredients = unstable_cache(
    async (): Promise<Ingredient[]> => {
        const supabase = createCacheClient();
        return fetchKitchenIngredients(supabase);
    },
    ['ingredients'],
    { tags: ['ingredients'], revalidate: 3600 }
);

export const getIngredientById = unstable_cache(
    async (id: string): Promise<Ingredient | null> => {
        const supabase = createCacheClient();
        return fetchKitchenIngredientById(supabase, id);
    },
    ['ingredient-by-id'],
    { tags: ['ingredients'], revalidate: 3600 }
);

export const getDistinctStores = unstable_cache(
    async (): Promise<string[]> => {
        const supabase = createCacheClient();
        return fetchKitchenDistinctStores(supabase);
    },
    ['distinct-stores'],
    { tags: ['ingredients'], revalidate: 3600 }
);
