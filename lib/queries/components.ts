import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { ComponentOption, RecipeComponent } from '@/lib/types/kitchen';
import {
    fetchComponentById as fetchKitchenComponentById,
    fetchComponentOptions as fetchKitchenComponentOptions,
    fetchComponents as fetchKitchenComponents,
} from './kitchen';

export type {
    ComponentIngredient,
    ComponentOption,
    RecipeComponent,
} from '@/lib/types/kitchen';

export const getComponents = cache(
    async (restaurantId: string): Promise<RecipeComponent[]> => {
        const supabase = await createClient();
        return fetchKitchenComponents(supabase, restaurantId);
    }
);

export const getComponentById = cache(
    async (id: string): Promise<RecipeComponent | null> => {
        const supabase = await createClient();
        return fetchKitchenComponentById(supabase, id);
    }
);

export const getComponentOptions = cache(
    async (restaurantId: string): Promise<ComponentOption[]> => {
        const supabase = await createClient();
        return fetchKitchenComponentOptions(supabase, restaurantId) as Promise<ComponentOption[]>;
    }
);
