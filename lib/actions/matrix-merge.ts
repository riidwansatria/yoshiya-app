'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

interface MenuMatrixChangeInput {
    menu_id: string;
    component_id: string;
    uploadedValue: number | null;
}

interface ComponentMatrixChangeInput {
    component_id: string;
    ingredient_id: string;
    uploadedValue: number | null;
}

export async function applyMenuMatrixChanges(
    restaurantId: string,
    changes: MenuMatrixChangeInput[]
) {
    const supabase = await createClient();

    const deletes = changes.filter((change) => change.uploadedValue === null);
    const upserts = changes
        .filter((change) => change.uploadedValue !== null)
        .map((change) => ({
            menu_id: change.menu_id,
            component_id: change.component_id,
            qty_per_order: change.uploadedValue as number,
        }));

    for (const row of deletes) {
        const { error } = await supabase
            .from('menu_components')
            .delete()
            .eq('menu_id', row.menu_id)
            .eq('component_id', row.component_id);

        if (error) {
            console.error('Error deleting menu component mapping:', error);
            return { error: 'Failed to apply CSV changes.' };
        }
    }

    if (upserts.length > 0) {
        const { error } = await supabase
            .from('menu_components')
            .upsert(upserts, { onConflict: 'menu_id,component_id' });

        if (error) {
            console.error('Error upserting menu component mappings:', error);
            return { error: 'Failed to apply CSV changes.' };
        }
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/menus/matrix', 'page');
    revalidatePath(`/dashboard/${restaurantId}/menus`, 'page');
    revalidatePath(`/dashboard/${restaurantId}/menus/matrix`, 'page');

    return {
        success: true,
        applied: changes.length,
        removed: deletes.length,
        upserted: upserts.length,
    };
}

export async function applyComponentMatrixChanges(
    restaurantId: string,
    changes: ComponentMatrixChangeInput[]
) {
    const supabase = await createClient();

    const deletes = changes.filter((change) => change.uploadedValue === null);
    const upserts = changes
        .filter((change) => change.uploadedValue !== null)
        .map((change) => ({
            component_id: change.component_id,
            ingredient_id: change.ingredient_id,
            qty_per_serving: change.uploadedValue as number,
        }));

    for (const row of deletes) {
        const { error } = await supabase
            .from('component_ingredients')
            .delete()
            .eq('component_id', row.component_id)
            .eq('ingredient_id', row.ingredient_id);

        if (error) {
            console.error('Error deleting component ingredient mapping:', error);
            return { error: 'Failed to apply CSV changes.' };
        }
    }

    if (upserts.length > 0) {
        const { error } = await supabase
            .from('component_ingredients')
            .upsert(upserts, { onConflict: 'component_id,ingredient_id' });

        if (error) {
            console.error('Error upserting component ingredient mappings:', error);
            return { error: 'Failed to apply CSV changes.' };
        }
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/components', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/components/matrix', 'page');
    revalidatePath(`/dashboard/${restaurantId}/components`, 'page');
    revalidatePath(`/dashboard/${restaurantId}/components/matrix`, 'page');

    return {
        success: true,
        applied: changes.length,
        removed: deletes.length,
        upserted: upserts.length,
    };
}
