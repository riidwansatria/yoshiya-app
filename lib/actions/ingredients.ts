'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { REVALIDATE_PATHS } from '@/lib/constants/routes';
import {
    normalizeIngredientPayload,
    type IngredientPayload,
    validateIngredientPayload,
} from '@/lib/validators/ingredients';

export async function createIngredient(data: IngredientPayload) {
    const supabase = await createClient();
    const payload = normalizeIngredientPayload(data);
    const validationError = validateIngredientPayload(payload);

    if (validationError) {
        return { error: validationError };
    }

    const { data: created, error } = await supabase
        .from('ingredients')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error creating ingredient:', error);
        if (error.code === '23505') {
            return { error: 'An ingredient with this name already exists' };
        }
        return { error: 'Failed to create ingredient' };
    }

    updateTag(CACHE_TAGS.INGREDIENTS);
    updateTag(CACHE_TAGS.COMPONENTS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_INGREDIENTS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_COMPONENTS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_COMPONENT_DETAIL_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_COMPONENT_NEW_PAGE, 'page');
    return { success: true, data: created };
}

export async function updateIngredient(
    id: string,
    data: IngredientPayload
) {
    const supabase = await createClient();
    const payload = normalizeIngredientPayload(data);
    const validationError = validateIngredientPayload(payload);

    if (validationError) {
        return { error: validationError };
    }

    const { error } = await supabase.from('ingredients').update(payload).eq('id', id);

    if (error) {
        console.error('Error updating ingredient:', error);
        if (error.code === '23505') {
            return { error: 'An ingredient with this name already exists' };
        }
        return { error: 'Failed to update ingredient' };
    }

    updateTag(CACHE_TAGS.INGREDIENTS);
    updateTag(CACHE_TAGS.COMPONENTS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_INGREDIENTS_PAGE, 'page');
    return { success: true };
}

export async function deleteIngredient(id: string) {
    const supabase = await createClient();

    const { error } = await supabase.from('ingredients').delete().eq('id', id);

    if (error) {
        console.error('Error deleting ingredient:', error);
        return { error: 'Failed to delete ingredient' };
    }

    updateTag(CACHE_TAGS.INGREDIENTS);
    updateTag(CACHE_TAGS.COMPONENTS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_INGREDIENTS_PAGE, 'page');
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

    const fields = { ...original } as Record<string, unknown>;
    delete fields.id;
    delete fields.created_at;
    delete fields.updated_at;
    const { error: insertError } = await supabase
        .from('ingredients')
        .insert([{ ...fields, name: `Copy of ${original.name}` }]);

    if (insertError) {
        return { error: 'Failed to duplicate ingredient' };
    }

    updateTag(CACHE_TAGS.INGREDIENTS);
    updateTag(CACHE_TAGS.COMPONENTS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_INGREDIENTS_PAGE, 'page');
    return { success: true };
}
