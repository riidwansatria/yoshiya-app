import { createClient } from '@/lib/supabase/server';
import { fetchIngredientById as fetchKitchenIngredientById, fetchIngredients as fetchKitchenIngredients } from './kitchen';

export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    category: string | null;
    package_size: number | null;
    package_label: string | null;
    created_at: string;
}

export async function getIngredients(): Promise<Ingredient[]> {
    const supabase = await createClient();
    return fetchKitchenIngredients(supabase);
}

export async function getIngredientById(id: string): Promise<Ingredient | null> {
    const supabase = await createClient();
    return fetchKitchenIngredientById(supabase, id);
}
