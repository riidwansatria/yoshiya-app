'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createIngredient(data: { name: string; unit: string; category?: string | null }) {
    const supabase = await createClient();

    const { error } = await supabase.from('ingredients').insert([data]);

    if (error) {
        console.error('Error creating ingredient:', error);
        return { error: 'Failed to create ingredient' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    return { success: true };
}

export async function updateIngredient(
    id: string,
    data: { name: string; unit: string; category?: string | null }
) {
    const supabase = await createClient();

    const { error } = await supabase.from('ingredients').update(data).eq('id', id);

    if (error) {
        console.error('Error updating ingredient:', error);
        return { error: 'Failed to update ingredient' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    return { success: true };
}

export async function deleteIngredient(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('ingredients').delete().eq('id', id);

    if (error) {
        console.error('Error deleting ingredient:', error);
        return { error: 'Failed to delete ingredient' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    return { success: true };
}

export async function duplicateIngredient(id: string) {
    const supabase = await createClient();

    const { data: original, error: fetchError } = await supabase
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .single();

    if (fetchError || !original) {
        return { error: 'Failed to fetch ingredient for duplication' };
    }

    const { id: _id, created_at: _ca, updated_at: _ua, ...fields } = original;
    const { error: insertError } = await supabase
        .from('ingredients')
        .insert([{ ...fields, name: `Copy of ${original.name}` }]);

    if (insertError) {
        return { error: 'Failed to duplicate ingredient' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    return { success: true };
}
