import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';
import type { Ingredient } from '@/lib/types/kitchen';
import {
    fetchIngredientById as fetchKitchenIngredientById,
    fetchIngredients as fetchKitchenIngredients,
    fetchDistinctStores as fetchKitchenDistinctStores,
    fetchDistinctCategories as fetchKitchenDistinctCategories,
} from './kitchen';

export type { Ingredient } from '@/lib/types/kitchen';

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

export const getDistinctCategories = unstable_cache(
    async (): Promise<string[]> => {
        const supabase = createCacheClient();
        return fetchKitchenDistinctCategories(supabase);
    },
    ['distinct-categories-v2'],
    { tags: ['ingredients'], revalidate: 3600 }
);
