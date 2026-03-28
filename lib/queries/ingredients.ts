import { createClient } from '@/lib/supabase/server';

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

    const { data, error } = await supabase
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching ingredients:', error);
        return [];
    }

    return data;
}
