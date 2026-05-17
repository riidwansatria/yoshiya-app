import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { Ingredient } from '@/lib/types/kitchen';
import {
    fetchIngredientById as fetchKitchenIngredientById,
    fetchIngredients as fetchKitchenIngredients,
    fetchDistinctStores as fetchKitchenDistinctStores,
    fetchDistinctCategories as fetchKitchenDistinctCategories,
} from './kitchen';

export type { Ingredient } from '@/lib/types/kitchen';

export const getIngredients = cache(
    async (): Promise<Ingredient[]> => {
        const supabase = await createClient();
        return fetchKitchenIngredients(supabase);
    }
);

export const getIngredientById = cache(
    async (id: string): Promise<Ingredient | null> => {
        const supabase = await createClient();
        return fetchKitchenIngredientById(supabase, id);
    }
);

export const getDistinctStores = cache(
    async (): Promise<string[]> => {
        const supabase = await createClient();
        return fetchKitchenDistinctStores(supabase);
    }
);

export const getDistinctCategories = cache(
    async (): Promise<string[]> => {
        const supabase = await createClient();
        return fetchKitchenDistinctCategories(supabase);
    }
);
