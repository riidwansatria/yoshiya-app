import { createClient } from '@/lib/supabase/server';
import { fetchMenuTags as fetchKitchenMenuTags } from './kitchen';

export interface MenuTag {
    id: string;
    label: string;
    created_at: string | null;
    updated_at: string | null;
}

export interface TagMenu {
    id: string;
    name: string;
    restaurant_id: string;
}

export interface MenuTagWithCount extends MenuTag {
    menu_count: number;
    menus: TagMenu[];
}

export async function getMenuTags(): Promise<MenuTag[]> {
    const supabase = await createClient();
    return fetchKitchenMenuTags(supabase);
}

export async function getMenuTagsWithCount(): Promise<MenuTagWithCount[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('menu_tags')
        .select('id, label, created_at, updated_at, menu_tag_assignments(menu_id, menus(id, name, restaurant_id))')
        .order('label', { ascending: true });

    if (error) {
        console.error('Error fetching menu tags with count:', error);
        return [];
    }

    type AssignmentRow = { menu_id: string; menus: TagMenu[] | TagMenu | null };
    type MenuTagWithAssignments = MenuTag & { menu_tag_assignments: AssignmentRow[] | null };

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
