import { unstable_cache } from 'next/cache';

import { createCacheClient } from '@/lib/supabase/cache';
import { Ingredient } from './ingredients';
import {
    fetchComponentById as fetchKitchenComponentById,
    fetchComponentOptions as fetchKitchenComponentOptions,
    fetchComponents as fetchKitchenComponents,
} from './kitchen';

export interface ComponentOption {
    id: string;
    name: string;
}

export interface RecipeComponent {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    yield_servings: number;
    created_at: string;
    component_ingredients?: ComponentIngredient[];
}

export interface ComponentIngredient {
    component_id: string;
    ingredient_id: string;
    qty_per_serving: number;
    ingredients?: Ingredient;
}

export const getComponents = unstable_cache(
    async (restaurantId: string): Promise<RecipeComponent[]> => {
        const supabase = createCacheClient();
        return fetchKitchenComponents(supabase, restaurantId);
    },
    ['components'],
    { tags: ['components'], revalidate: 3600 }
);

export const getComponentById = unstable_cache(
    async (id: string): Promise<RecipeComponent | null> => {
        const supabase = createCacheClient();
        return fetchKitchenComponentById(supabase, id);
    },
    ['component-by-id'],
    { tags: ['components'], revalidate: 3600 }
);

export const getComponentOptions = unstable_cache(
    async (restaurantId: string): Promise<ComponentOption[]> => {
        const supabase = createCacheClient();
        return fetchKitchenComponentOptions(supabase, restaurantId) as Promise<ComponentOption[]>;
    },
    ['component-options'],
    { tags: ['components'], revalidate: 3600 }
);
