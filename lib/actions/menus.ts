'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath, updateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { REVALIDATE_PATHS } from '@/lib/constants/routes';

type MenuFields = {
    name: string;
    season?: string | null;
    price?: number | null;
    description?: string | null;
    color?: string | null;
    image_url?: string | null;
    is_public?: boolean;
};

type MenuCreatePayload = MenuFields & {
    restaurant_id: string;
};

function normalizeMenuFields(data: MenuFields) {
    return {
        name: data.name.trim(),
        season: data.season?.trim() ? data.season.trim() : null,
        price: data.price ?? null,
        description: data.description?.trim() ? data.description.trim() : null,
        color: data.color?.trim() ? data.color.trim() : null,
        image_url: data.image_url?.trim() ? data.image_url.trim() : null,
        is_public: data.is_public ?? true,
    };
}

export async function createMenu(data: MenuCreatePayload) {
    const supabase = await createClient();
    const payload = {
        restaurant_id: data.restaurant_id,
        ...normalizeMenuFields(data),
    };

    if (!payload.name) {
        return { error: 'Menu name is required' };
    }

    const { data: newMenu, error } = await supabase
        .from('menus')
        .insert([payload])
        .select()
        .single();

    if (error) {
        console.error('Error creating menu:', error);
        if (error.code === '23505') {
            return { error: 'A menu with this name already exists' };
        }
        return { error: 'Failed to create menu' };
    }

    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    return { success: true, data: newMenu };
}

export async function updateMenu(
    id: string,
    data: MenuFields
) {
    const supabase = await createClient();
    const updatePayload = normalizeMenuFields(data);

    if (!updatePayload.name) {
        return { error: 'Menu name is required' };
    }

    const { error } = await supabase.from('menus').update(updatePayload).eq('id', id);

    if (error) {
        console.error('Error updating menu:', error);
        if (error.code === '23505') {
            return { error: 'A menu with this name already exists' };
        }
        return { error: 'Failed to update menu' };
    }

    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');
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

    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
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
    const menuFields = { ...original } as Record<string, unknown>;
    delete menuFields.id;
    delete menuFields.created_at;
    delete menuFields.updated_at;
    const menuComponents = menuFields.menu_components as { id: string; created_at: string;[key: string]: unknown }[] | undefined;
    delete menuFields.menu_components;
    const { data: newMenu, error: insertError } = await supabase
        .from('menus')
        .insert([{ ...menuFields, name: `Copy of ${original.name}` }])
        .select()
        .single();

    if (insertError || !newMenu) {
        return { error: 'Failed to duplicate menu' };
    }

    // Duplicate menu_components
    if (menuComponents && menuComponents.length > 0) {
        const newComponents = menuComponents.map((menuComponent) => {
            const next = { ...menuComponent } as Record<string, unknown>;
            delete next.id;
            delete next.created_at;
            return {
                ...next,
                menu_id: newMenu.id,
            };
        });
        await supabase.from('menu_components').insert(newComponents);
    }

    const { data: originalTagAssignments, error: tagFetchError } = await supabase
        .from('menu_tag_assignments')
        .select('tag_id')
        .eq('menu_id', id);

    if (tagFetchError) {
        console.error('Error fetching menu tags for duplication:', tagFetchError);
        return { error: 'Failed to duplicate menu tags' };
    }

    if ((originalTagAssignments ?? []).length > 0) {
        const { error: tagInsertError } = await supabase
            .from('menu_tag_assignments')
            .insert(
                (originalTagAssignments ?? []).map((assignment) => ({
                    menu_id: newMenu.id,
                    tag_id: assignment.tag_id,
                }))
            );

        if (tagInsertError) {
            console.error('Error duplicating menu tags:', tagInsertError);
            return { error: 'Failed to duplicate menu tags' };
        }
    }

    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    return { success: true, data: newMenu };
}
