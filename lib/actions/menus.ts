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
