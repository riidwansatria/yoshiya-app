import { createClient } from '@/lib/supabase/server';
import { Ingredient } from './ingredients';

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

    const { data, error } = await supabase
        .from('components')
        .select(`
      *,
      component_ingredients (
        component_id,
        ingredient_id,
        qty_per_serving,
        ingredients (*)
      )
    `)
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching components:', error);
        return [];
    }

    return data as RecipeComponent[];
}

export async function getComponentById(id: string): Promise<RecipeComponent | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('components')
        .select(`
      *,
      component_ingredients (
        component_id,
        ingredient_id,
        qty_per_serving,
        ingredients (*)
      )
    `)
        .eq('id', id)
        .single();

    if (error) {
        console.error('[getComponentById] Error for ID:', id, '→', error.message, error.code, error.details);
        return null;
    }

    return data as RecipeComponent;
}

export async function getComponentOptions(restaurantId: string): Promise<ComponentOption[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('components')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching component options:', error);
        return [];
    }

    return data as ComponentOption[];
}
