'use server';

import { revalidatePath, updateTag } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import type { MenuTag, MenuTagKind } from '@/lib/types/kitchen';
import { CACHE_TAGS } from '@/lib/constants/cache-tags';
import { REVALIDATE_PATHS } from '@/lib/constants/routes';
import {
    dedupeMenuTagIds,
    normalizeMenuTagLabel,
    normalizeMenuTagLookupLabel,
} from '@/lib/utils/menu-tags';

function normalizeOptionalLabel(value: string | null | undefined): string | null {
    if (!value) return null;
    const trimmed = value.trim();
    return trimmed || null;
}

function labelCollides(
    tags: MenuTag[],
    label: string,
    labelEn: string | null,
    excludeId?: string
): boolean {
    const normalizedLabel = normalizeMenuTagLookupLabel(label);
    const normalizedLabelEn = labelEn ? normalizeMenuTagLookupLabel(labelEn) : null;

    return tags
        .filter((t) => t.id !== excludeId)
        .some((t) => {
            if (normalizeMenuTagLookupLabel(t.label) === normalizedLabel) return true;
            if (normalizedLabelEn && t.label_en && normalizeMenuTagLookupLabel(t.label_en) === normalizedLabelEn) return true;
            return false;
        });
}

function invalidateCaches() {
    updateTag(CACHE_TAGS.MENU_TAGS);
    updateTag(CACHE_TAGS.MENUS);
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENU_DETAIL_PAGE, 'page');
}

export async function createMenuTag(label: string, options: { labelEn?: string; kind: MenuTagKind }) {
    const supabase = await createClient();
    const normalized = normalizeMenuTagLabel(label);

    if (!normalized) {
        return { error: 'Tag label is required' };
    }

    const labelEn = normalizeOptionalLabel(options.labelEn);
    const { kind } = options;

    const { data: existingTags, error: existingError } = await supabase
        .from('menu_tags')
        .select('*')
        .order('label', { ascending: true });

    if (existingError) {
        console.error('Error checking existing menu tags:', existingError);
        return { error: 'Failed to create tag' };
    }

    const allTags = (existingTags ?? []) as MenuTag[];
    const normalizedLookup = normalizeMenuTagLookupLabel(normalized);
    const existingTag = allTags.find(
        (tag) => normalizeMenuTagLookupLabel(tag.label) === normalizedLookup
    );

    if (existingTag) {
        return { success: true, data: existingTag };
    }

    if (labelEn && labelCollides(allTags, normalized, labelEn)) {
        return { error: 'A tag with this English name already exists' };
    }

    const { data: createdTag, error } = await supabase
        .from('menu_tags')
        .insert([{ label: normalized, label_en: labelEn, kind }])
        .select()
        .single();

    if (error) {
        console.error('Error creating menu tag:', error);
        return { error: 'Failed to create tag' };
    }

    invalidateCaches();

    return { success: true, data: createdTag as MenuTag };
}

export async function updateMenuTag(
    tagId: string,
    updates: { label?: string; labelEn?: string | null; kind?: MenuTagKind }
) {
    const supabase = await createClient();

    const { data: existingTags, error: existingError } = await supabase
        .from('menu_tags')
        .select('id, label, label_en, kind')
        .order('label', { ascending: true });

    if (existingError) {
        console.error('Error checking existing menu tags:', existingError);
        return { error: 'Failed to update tag' };
    }

    const allTags = (existingTags ?? []) as MenuTag[];
    const current = allTags.find((t) => t.id === tagId);
    if (!current) {
        return { error: 'Tag not found' };
    }

    const patch: Record<string, unknown> = {};

    if (updates.label !== undefined) {
        const normalized = normalizeMenuTagLabel(updates.label);
        if (!normalized) return { error: 'Tag label is required' };

        const conflict = allTags
            .filter((t) => t.id !== tagId)
            .find((t) => normalizeMenuTagLookupLabel(t.label) === normalizeMenuTagLookupLabel(normalized));
        if (conflict) return { error: 'A tag with this name already exists' };

        patch.label = normalized;
    }

    if ('labelEn' in updates) {
        const labelEn = normalizeOptionalLabel(updates.labelEn ?? null);

        if (labelEn) {
            const conflict = allTags
                .filter((t) => t.id !== tagId)
                .find((t) => t.label_en && normalizeMenuTagLookupLabel(t.label_en) === normalizeMenuTagLookupLabel(labelEn));
            if (conflict) return { error: 'A tag with this English name already exists' };
        }

        patch.label_en = labelEn;
    }

    if (updates.kind !== undefined) {
        patch.kind = updates.kind;
    }

    if (Object.keys(patch).length === 0) {
        return { success: true, data: current };
    }

    const { data: updatedTag, error } = await supabase
        .from('menu_tags')
        .update(patch)
        .eq('id', tagId)
        .select()
        .single();

    if (error) {
        console.error('Error updating menu tag:', error);
        return { error: 'Failed to update tag' };
    }

    invalidateCaches();

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

    invalidateCaches();

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

    invalidateCaches();

    return { success: true };
}
