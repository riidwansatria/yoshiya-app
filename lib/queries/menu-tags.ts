import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';
import type { MenuTag, MenuTagWithCount, TagMenu } from '@/lib/types/kitchen';
import { fetchMenuTags as fetchKitchenMenuTags } from './kitchen';

export type { MenuTag, MenuTagWithCount, TagMenu } from '@/lib/types/kitchen';

export const getMenuTags = cache(
    async (): Promise<MenuTag[]> => {
        const supabase = await createClient();
        return fetchKitchenMenuTags(supabase);
    }
);

type AssignmentRow = { menu_id: string; menus: TagMenu[] | TagMenu | null };
type MenuTagWithAssignments = MenuTag & { menu_tag_assignments: AssignmentRow[] | null };

export const getMenuTagsWithCount = cache(
    async (): Promise<MenuTagWithCount[]> => {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('menu_tags')
            .select('id, label, label_en, kind, created_at, updated_at, menu_tag_assignments(menu_id, menus(id, name, restaurant_id))')
            .order('label', { ascending: true });

        if (error) {
            console.error('Error fetching menu tags with count:', error);
            return [];
        }

        return ((data ?? []) as unknown as MenuTagWithAssignments[]).map(({ menu_tag_assignments, ...tag }) => {
            const assignments = Array.isArray(menu_tag_assignments) ? menu_tag_assignments : [];

            const menus = assignments.flatMap((assignment) => {
                const relatedMenus = Array.isArray(assignment.menus)
                    ? assignment.menus
                    : assignment.menus
                        ? [assignment.menus]
                        : [];

                return relatedMenus.filter((menu): menu is TagMenu => Boolean(menu));
            });

            return { ...tag, menu_count: menus.length, menus };
        });
    }
);
