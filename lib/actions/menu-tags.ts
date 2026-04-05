'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { MenuTag } from '@/lib/queries/menu-tags';
import {
    dedupeMenuTagIds,
    normalizeMenuTagLabel,
    normalizeMenuTagLookupLabel,
} from '@/lib/utils/menu-tags';

type CreateMenuTagPayload = {
    restaurant_id: string;
    label: string;
};

export async function createMenuTag(data: CreateMenuTagPayload) {
    const supabase = await createClient();
    const label = normalizeMenuTagLabel(data.label);

    if (!label) {
        return { error: 'Tag label is required' };
    }

    const normalizedLabel = normalizeMenuTagLookupLabel(label);
    const { data: existingTags, error: existingError } = await supabase
        .from('menu_tags')
        .select('*')
        .eq('restaurant_id', data.restaurant_id)
        .order('label', { ascending: true });

    if (existingError) {
        console.error('Error checking existing menu tags:', existingError);
        return { error: 'Failed to create tag' };
    }

    const existingTag = ((existingTags ?? []) as MenuTag[]).find(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedLabel
    );

    if (existingTag) {
        return { success: true, data: existingTag };
    }

    const { data: createdTag, error } = await supabase
        .from('menu_tags')
        .insert([
            {
                restaurant_id: data.restaurant_id,
                label,
            },
        ])
        .select()
        .single();

    if (error) {
        console.error('Error creating menu tag:', error);
        return { error: 'Failed to create tag' };
    }

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/menus/[id]', 'page');

    return { success: true, data: createdTag as MenuTag };
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

    revalidatePath('/[lang]/dashboard/[restaurant]/menus', 'page');
    revalidatePath('/[lang]/dashboard/[restaurant]/menus/[id]', 'page');

    return { success: true };
}
