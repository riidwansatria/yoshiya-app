'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
    buildDashboardComponentsMatrixPath,
    buildDashboardComponentsPath,
    buildDashboardMenusMatrixPath,
    buildDashboardMenusPath,
    REVALIDATE_PATHS,
} from '@/lib/constants/routes';
import { requireAdminRole } from '@/lib/auth/server';
import { createAndApplyKitchenImport } from '@/lib/actions/kitchen-import';
import type { KitchenImportPayload } from '@/lib/kitchen/import-types';

interface MenuMatrixChangeInput {
    menu_id: string;
    component_id: string;
    uploadedValue: number | null;
}

interface ComponentMatrixChangeInput {
    component_id: string;
    ingredient_id: string;
    uploadedValue: number | null;
}

export async function applyMenuMatrixChanges(
    restaurantId: string,
    changes: MenuMatrixChangeInput[]
) {
    await requireAdminRole();
    const supabase = await createClient();
    const menuIds = [...new Set(changes.map((change) => change.menu_id))];
    const componentIds = [...new Set(changes.map((change) => change.component_id))];
    const [{ data: menus }, { data: components }, { data: relationships }] = await Promise.all([
        supabase.from('menus').select('id').eq('restaurant_id', restaurantId).in('id', menuIds),
        supabase.from('components').select('id').eq('restaurant_id', restaurantId).in('id', componentIds),
        supabase
            .from('menu_components')
            .select('menu_id, component_id, qty_per_order, updated_at')
            .in('menu_id', menuIds)
            .in('component_id', componentIds),
    ]);
    if ((menus ?? []).length !== menuIds.length || (components ?? []).length !== componentIds.length) {
        return { error: 'CSV contains records outside the selected restaurant.' };
    }
    const currentByKey = new Map(
        (relationships ?? []).map((row) => [`${row.menu_id}:${row.component_id}`, row])
    );
    const payload: KitchenImportPayload = {
        ingredients: [],
        components: [],
        menus: [],
        component_ingredients: [],
        menu_components: changes.map((change) => {
            const current = currentByKey.get(`${change.menu_id}:${change.component_id}`);
            return {
                action: change.uploadedValue === null ? 'remove' : 'set',
                menu_ref: change.menu_id,
                component_ref: change.component_id,
                quantity_per_menu_order: change.uploadedValue === null ? '' : String(change.uploadedValue),
                relationship_version: current?.updated_at ?? null,
            };
        }),
    };
    const result = await createAndApplyKitchenImport({
        restaurantId,
        payload,
        operationCounts: { menu_components: changes.length },
        beforeSnapshot: Object.fromEntries(
            changes.map((change) => [
                `${change.menu_id}:${change.component_id}`,
                currentByKey.get(`${change.menu_id}:${change.component_id}`) ?? null,
            ])
        ),
        afterSnapshot: Object.fromEntries(
            changes.map((change) => [
                `${change.menu_id}:${change.component_id}`,
                change.uploadedValue,
            ])
        ),
    });
    if ('error' in result) return result;

    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_MENUS_MATRIX_PAGE, 'page');
    revalidatePath(buildDashboardMenusPath(restaurantId), 'page');
    revalidatePath(buildDashboardMenusMatrixPath(restaurantId), 'page');

    return {
        success: true,
        applied: changes.length,
        removed: changes.filter((change) => change.uploadedValue === null).length,
        upserted: changes.filter((change) => change.uploadedValue !== null).length,
    };
}

export async function applyComponentMatrixChanges(
    restaurantId: string,
    changes: ComponentMatrixChangeInput[]
) {
    await requireAdminRole();
    const supabase = await createClient();
    const componentIds = [...new Set(changes.map((change) => change.component_id))];
    const ingredientIds = [...new Set(changes.map((change) => change.ingredient_id))];
    const [{ data: components }, { data: ingredients }, { data: relationships }] = await Promise.all([
        supabase.from('components').select('id').eq('restaurant_id', restaurantId).in('id', componentIds),
        supabase.from('ingredients').select('id').in('id', ingredientIds),
        supabase
            .from('component_ingredients')
            .select('component_id, ingredient_id, batch_quantity, updated_at')
            .in('component_id', componentIds)
            .in('ingredient_id', ingredientIds),
    ]);
    if ((components ?? []).length !== componentIds.length || (ingredients ?? []).length !== ingredientIds.length) {
        return { error: 'CSV contains invalid component or ingredient records.' };
    }
    const currentByKey = new Map(
        (relationships ?? []).map((row) => [`${row.component_id}:${row.ingredient_id}`, row])
    );
    const payload: KitchenImportPayload = {
        ingredients: [],
        components: [],
        menus: [],
        component_ingredients: changes.map((change) => {
            const current = currentByKey.get(`${change.component_id}:${change.ingredient_id}`);
            return {
                action: change.uploadedValue === null ? 'remove' : 'set',
                component_ref: change.component_id,
                ingredient_ref: change.ingredient_id,
                batch_quantity: change.uploadedValue === null ? '' : String(change.uploadedValue),
                relationship_version: current?.updated_at ?? null,
            };
        }),
        menu_components: [],
    };
    const result = await createAndApplyKitchenImport({
        restaurantId,
        payload,
        operationCounts: { component_ingredients: changes.length },
        beforeSnapshot: Object.fromEntries(
            changes.map((change) => [
                `${change.component_id}:${change.ingredient_id}`,
                currentByKey.get(`${change.component_id}:${change.ingredient_id}`) ?? null,
            ])
        ),
        afterSnapshot: Object.fromEntries(
            changes.map((change) => [
                `${change.component_id}:${change.ingredient_id}`,
                change.uploadedValue,
            ])
        ),
    });
    if ('error' in result) return result;

    revalidatePath(REVALIDATE_PATHS.DASHBOARD_COMPONENTS_PAGE, 'page');
    revalidatePath(REVALIDATE_PATHS.DASHBOARD_COMPONENTS_MATRIX_PAGE, 'page');
    revalidatePath(buildDashboardComponentsPath(restaurantId), 'page');
    revalidatePath(buildDashboardComponentsMatrixPath(restaurantId), 'page');

    return {
        success: true,
        applied: changes.length,
        removed: changes.filter((change) => change.uploadedValue === null).length,
        upserted: changes.filter((change) => change.uploadedValue !== null).length,
    };
}
