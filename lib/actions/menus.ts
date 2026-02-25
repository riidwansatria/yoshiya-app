'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createMenu(data: {
    restaurant_id: string;
    name: string;
    season?: string | null;
    price?: number | null;
    description?: string | null;
    color?: string | null;
}) {
    const supabase = await createClient();

    const { data: newMenu, error } = await supabase
        .from('menus')
        .insert([data])
        .select()
        .single();

    if (error) {
        console.error('Error creating menu:', error);
        return { error: 'Failed to create menu' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    return { success: true, data: newMenu };
}

export async function updateMenu(
    id: string,
    data: {
        name?: string;
        season?: string | null;
        price?: number | null;
        description?: string | null;
        color?: string | null;
    }
) {
    const supabase = await createClient();

    const { error } = await supabase.from('menus').update(data).eq('id', id);

    if (error) {
        console.error('Error updating menu:', error);
        return { error: 'Failed to update menu' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/menus/[id]', 'page');
    return { success: true };
}

export async function deleteMenu(id: string) {
    const supabase = await createClient();

    // Menu components are cascade deleted if FK constraint allows, 
    // but if components mapping has ON DELETE CASCADE it handles itself.
    const { error } = await supabase.from('menus').delete().eq('id', id);

    if (error) {
        console.error('Error deleting menu:', error);
        return { error: 'Failed to delete menu' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    return { success: true };
}

export async function duplicateMenu(id: string) {
    const supabase = await createClient();

    // Fetch the original menu
    const { data: original, error: fetchError } = await supabase
        .from('menus')
        .select('*, menu_components(*)')
        .eq('id', id)
        .single();

    if (fetchError || !original) {
        return { error: 'Failed to fetch menu for duplication' };
    }

    // Insert the new menu
    const { id: _id, created_at: _ca, updated_at: _ua, menu_components, ...menuFields } = original;
    const { data: newMenu, error: insertError } = await supabase
        .from('menus')
        .insert([{ ...menuFields, name: `Copy of ${original.name}` }])
        .select()
        .single();

    if (insertError || !newMenu) {
        return { error: 'Failed to duplicate menu' };
    }

    // Duplicate menu_components
    if (menu_components && menu_components.length > 0) {
        const newComponents = menu_components.map(
            ({ id: _mcId, created_at: _mcCa, ...mc }: { id: string; created_at: string;[key: string]: unknown }) => ({
                ...mc,
                menu_id: newMenu.id,
            })
        );
        await supabase.from('menu_components').insert(newComponents);
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    return { success: true, data: newMenu };
}
