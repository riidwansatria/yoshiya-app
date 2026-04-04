import { createClient } from '@/lib/supabase/server';
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

export async function getComponents(restaurantId: string): Promise<RecipeComponent[]> {
    const supabase = await createClient();
    return fetchKitchenComponents(supabase, restaurantId);
}

export async function getComponentById(id: string): Promise<RecipeComponent | null> {
    const supabase = await createClient();
    return fetchKitchenComponentById(supabase, id);
}

export async function getComponentOptions(restaurantId: string): Promise<ComponentOption[]> {
    const supabase = await createClient();
    return fetchKitchenComponentOptions(supabase, restaurantId) as Promise<ComponentOption[]>;
}
