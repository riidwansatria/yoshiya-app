'use server';

import { createClient } from '@/lib/supabase/server';
export async function updateMenuComponents(
    menuId: string,
    components: { component_id: string; qty_per_order: number }[]
) {
    const supabase = await createClient();

    const { error: deleteError } = await supabase
        .from('menu_components')
        .delete()
        .eq('menu_id', menuId);

    if (deleteError) {
        console.error('Error clearing old menu components:', deleteError);
        return { error: 'Failed to update component mapping' };
    }

    if (components.length > 0) {
        const insertData = components.map((comp) => ({
            menu_id: menuId,
            component_id: comp.component_id,
            qty_per_order: comp.qty_per_order,
        }));

        const { error: insertError } = await supabase
            .from('menu_components')
            .insert(insertData);

        if (insertError) {
            console.error('Error inserting new menu components:', insertError);
            return { error: 'Failed to update component mapping' };
        }
    }

    return { success: true };
}
