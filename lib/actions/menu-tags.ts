'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { MenuTag } from '@/lib/queries/menu-tags';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { REVALIDATE_PATHS } from '@/lib/constants/routes';
import {
    dedupeMenuTagIds,
    normalizeMenuTagLabel,
    normalizeMenuTagLookupLabel,
} from '@/lib/utils/menu-tags';

export async function createMenuTag(label: string) {
    const supabase = await createClient();
    const normalized = normalizeMenuTagLabel(label);

    if (!normalized) {
        return { error: 'Tag label is required' };
    }

    const normalizedLookup = normalizeMenuTagLookupLabel(normalized);
    const { data: existingTags, error: existingError } = await supabase
        .from('menu_tags')
        .select('*')
        .order('label', { ascending: true });

    if (existingError) {
        console.error('Error checking existing menu tags:', existingError);
        return { error: 'Failed to create tag' };
    }

    const existingTag = ((existingTags ?? []) as MenuTag[]).find(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedLookup
    );

    if (existingTag) {
        return { success: true, data: existingTag };
    }

    const { data: createdTag, error } = await supabase
        .from('menu_tags')
        .insert([{ label: normalized }])
        .select()
        .single();

    if (error) {
        console.error('Error creating menu tag:', error);
        return { error: 'Failed to create tag' };
    }

    updateTag(CACHE_TAGS.MENU_TAGS);
    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');

    return { success: true, data: createdTag as MenuTag };
}

export async function renameMenuTag(tagId: string, newLabel: string) {
    const supabase = await createClient();
    const normalized = normalizeMenuTagLabel(newLabel);

    if (!normalized) {
        return { error: 'Tag label is required' };
    }

    const normalizedLookup = normalizeMenuTagLookupLabel(normalized);
    const { data: existingTags, error: existingError } = await supabase
        .from('menu_tags')
        .select('id, label')
        .neq('id', tagId);

    if (existingError) {
        console.error('Error checking existing menu tags:', existingError);
        return { error: 'Failed to rename tag' };
    }

    const conflict = ((existingTags ?? []) as MenuTag[]).find(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedLookup
    );

    if (conflict) {
        return { error: 'A tag with this name already exists' };
    }

    const { data: updatedTag, error } = await supabase
        .from('menu_tags')
        .update({ label: normalized })
        .eq('id', tagId)
        .select()
        .single();

    if (error) {
        console.error('Error renaming menu tag:', error);
        return { error: 'Failed to rename tag' };
    }

    updateTag(CACHE_TAGS.MENU_TAGS);
    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');

    return { success: true, data: updatedTag as MenuTag };
}

export async function deleteMenuTag(tagId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('menu_tags')
        .delete()
        .eq('id', tagId);

    if (error) {
        console.error('Error deleting menu tag:', error);
        return { error: 'Failed to delete tag' };
    }

    updateTag(CACHE_TAGS.MENU_TAGS);
    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');

    return { success: true };
}

export async function updateMenuTags(menuId: string, tagIds: string[]) {
    const supabase = await createClient();
    const nextTagIds = dedupeMenuTagIds(tagIds);

    const { error: deleteError } = await supabase
        .from('menu_tag_assignments')
        .delete()
        .eq('menu_id', menuId);

    if (deleteError) {
        console.error('Error clearing old menu tags:', deleteError);
        return { error: 'Failed to update menu tags' };
    }

    if (nextTagIds.length > 0) {
        const { error: insertError } = await supabase
            .from('menu_tag_assignments')
            .insert(nextTagIds.map((tagId) => ({ menu_id: menuId, tag_id: tagId })));

        if (insertError) {
            console.error('Error inserting new menu tags:', insertError);
            return { error: 'Failed to update menu tags' };
        }
    }

    updateTag(CACHE_TAGS.MENU_TAGS);
    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');

    return { success: true };
}
