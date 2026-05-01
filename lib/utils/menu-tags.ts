import type { MenuTag } from '@/lib/types/kitchen';

export type { MenuTagKind } from '@/lib/types/kitchen';

export type MenuTagFilterMode = 'include' | 'exclude';

export interface MenuTagFilterSelection {
    tagId: string;
    mode: MenuTagFilterMode;
}

export function normalizeMenuTagLabel(label: string) {
    return label.trim();
}

export function normalizeMenuTagLookupLabel(label: string) {
    return normalizeMenuTagLabel(label).toLocaleLowerCase();
}

export function dedupeMenuTagIds(tagIds: string[]) {
    return Array.from(new Set(tagIds.filter(Boolean)));
}

export function getLocalizedTagLabel(tag: MenuTag, locale: string): string {
    return locale === 'en' && tag.label_en ? tag.label_en : tag.label;
}

export function partitionTagsByKind(tags: MenuTag[]): { dietary: MenuTag[]; ingredient: MenuTag[] } {
    const dietary: MenuTag[] = [];
    const ingredient: MenuTag[] = [];
    for (const tag of tags) {
        if (tag.kind === 'dietary') dietary.push(tag);
        else ingredient.push(tag);
    }
    return { dietary, ingredient };
}

export function menuMatchesTagFilters(
    menuTagIds: string[],
    filters: MenuTagFilterSelection[]
) {
    if (filters.length === 0) {
        return true;
    }

    const menuTagIdSet = new Set(menuTagIds);
    const includeIds = new Set<string>();
    const excludeIds = new Set<string>();

    for (const filter of filters) {
        if (filter.mode === 'exclude') {
            excludeIds.add(filter.tagId);
            continue;
        }

        includeIds.add(filter.tagId);
    }

    for (const excludeId of excludeIds) {
        if (menuTagIdSet.has(excludeId)) {
            return false;
        }
    }

    if (includeIds.size === 0) {
        return true;
    }

    for (const includeId of includeIds) {
        if (!menuTagIdSet.has(includeId)) {
            return false;
        }
    }

    return true;
}
