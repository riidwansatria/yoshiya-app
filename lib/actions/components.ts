'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

type ComponentFields = {
    name: string;
    description?: string | null;
    yield_servings: number;
};

type ComponentCreatePayload = ComponentFields & {
    restaurant_id: string;
};

function normalizeComponentFields(data: ComponentFields) {
    return {
        name: data.name.trim(),
        description: data.description?.trim() ? data.description.trim() : null,
        yield_servings: data.yield_servings,
    };
}

export async function createComponent(data: ComponentCreatePayload) {
    const supabase = await createClient();
    const payload = {
        restaurant_id: data.restaurant_id,
        ...normalizeComponentFields(data),
    };

    if (!payload.name) {
        return { error: 'Component name is required' };
    }

    const { data: newComponent, error } = await supabase
        .from('components')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error creating component:', error);
        if (error.code === '23505') {
            return { error: 'A component with this name already exists' };
        }
        return { error: 'Failed to create component' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    return { success: true, data: newComponent };
}

export async function updateComponent(
    id: string,
    data: ComponentFields
) {
    const supabase = await createClient();
    const payload = normalizeComponentFields(data);

    if (!payload.name) {
        return { error: 'Component name is required' };
    }

    const { error } = await supabase.from('components').update(payload).eq('id', id);

    if (error) {
        console.error('Error updating component:', error);
        if (error.code === '23505') {
            return { error: 'A component with this name already exists' };
        }
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

export async function duplicateComponent(id: string) {
    const supabase = await createClient();

    // Fetch original with ingredients
    const { data: original, error: fetchError } = await supabase
        .from('components')
        .select('*, component_ingredients(*)')
        .eq('id', id)
        .single();

    if (fetchError || !original) {
        return { error: 'Failed to fetch component for duplication' };
    }

    const fields = { ...original } as Record<string, unknown>;
    delete fields.id;
    delete fields.created_at;
    delete fields.updated_at;
    const componentIngredients = fields.component_ingredients as { id: string; created_at: string;[key: string]: unknown }[] | undefined;
    delete fields.component_ingredients;
    const { data: newComp, error: insertError } = await supabase
        .from('components')
        .insert([{ ...fields, name: `Copy of ${original.name}` }])
        .select()
        .single();

    if (insertError || !newComp) {
        return { error: 'Failed to duplicate component' };
    }

    if (componentIngredients && componentIngredients.length > 0) {
        const newIngredients = componentIngredients.map((componentIngredient) => {
            const next = { ...componentIngredient } as Record<string, unknown>;
            delete next.id;
            delete next.created_at;
            return {
                ...next,
                component_id: newComp.id,
            };
        });
        await supabase.from('component_ingredients').insert(newIngredients);
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    return { success: true, data: newComp };
}
