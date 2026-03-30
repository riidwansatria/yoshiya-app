'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type IngredientPayload = {
    name: string;
    unit: string;
    category?: string | null;
    package_size?: number | null;
    package_label?: string | null;
};

function normalizeIngredientPayload(data: IngredientPayload) {
    const packageSize = data.package_size ?? null;

    return {
        name: data.name.trim(),
        unit: data.unit.trim(),
        category: data.category?.trim() ? data.category.trim() : null,
        package_size: packageSize,
        package_label: data.package_label?.trim() ? data.package_label.trim() : null,
    };
}

function validateIngredientPayload(data: ReturnType<typeof normalizeIngredientPayload>) {
    if (!data.name) {
        return 'Ingredient name is required';
    }

    if (data.package_size !== null && data.package_size <= 0) {
        return 'Package size must be greater than 0';
    }

    return null;
}

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

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components/[id]', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components/new', 'page');
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

    revalidatePath('/[lang]/dashboard/[restaurant]/ingredients', 'page');
    return { success: true };
}
