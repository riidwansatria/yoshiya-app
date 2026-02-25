'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createComponent(data: {
    restaurant_id: string;
    name: string;
    description?: string | null;
    yield_servings: number;
}) {
    const supabase = await createClient();

    const { data: newComponent, error } = await supabase
        .from('components')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error creating component:', error);
        return { error: 'Failed to create component' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    return { success: true, data: newComponent };
}

export async function updateComponent(
    id: string,
    data: {
        name: string;
        description?: string | null;
        yield_servings: number;
    }
) {
    const supabase = await createClient();

    const { error } = await supabase.from('components').update(data).eq('id', id);

    if (error) {
        console.error('Error updating component:', error);
        return { error: 'Failed to update component' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components/[id]', 'page');
    return { success: true };
}

export async function deleteComponent(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('components').delete().eq('id', id);

    if (error) {
        console.error('Error deleting component:', error);
        return { error: 'Failed to delete component' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    return { success: true };
}

export async function updateComponentIngredients(
    componentId: string,
    ingredients: { ingredient_id: string; qty_per_serving: number }[]
) {
    const supabase = await createClient();

    // Simple sync strategy: delete all old, insert new
    // Note: in high-concurrency, this might be problematic, but fine for internal tool
    const { error: deleteError } = await supabase
        .from('component_ingredients')
        .delete()
        .eq('component_id', componentId);

    if (deleteError) {
        console.error('Error clearing old component ingredients:', deleteError);
        return { error: 'Failed to update ingredients mapping' };
    }

    if (ingredients.length > 0) {
        const insertData = ingredients.map((ing) => ({
            component_id: componentId,
            ingredient_id: ing.ingredient_id,
            qty_per_serving: ing.qty_per_serving,
        }));

        const { error: insertError } = await supabase
            .from('component_ingredients')
            .insert(insertData);

        if (insertError) {
            console.error('Error inserting new component ingredients:', insertError);
            return { error: 'Failed to update ingredients mapping' };
        }
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components/[id]', 'page');
    return { success: true };
}
