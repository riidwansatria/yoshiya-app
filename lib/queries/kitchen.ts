import type { SupabaseClient } from '@supabase/supabase-js';

import type { RecipeComponent } from './components';
import type { Ingredient } from './ingredients';
import type { Menu } from './menus';

export type KitchenClient = SupabaseClient;

const COMPONENTS_SELECT = `
  *,
  component_ingredients (
    component_id,
    ingredient_id,
    qty_per_serving,
    ingredients (*)
  )
`;

interface FetchMenusOptions {
    includeMenuComponents?: boolean;
    includeComponentDetails?: boolean;
}

export function buildMenusSelect({
    includeMenuComponents = false,
    includeComponentDetails = false,
}: FetchMenusOptions = {}) {
    const baseSelect = 'id, restaurant_id, name, season, price, description, color';

    if (!includeMenuComponents) {
        return baseSelect;
    }

    const componentSelect = includeComponentDetails ? ', components (id, name)' : '';
    return `${baseSelect}, menu_components (menu_id, component_id, qty_per_order${componentSelect})`;
}

export async function fetchIngredients(client: KitchenClient): Promise<Ingredient[]> {
    const { data, error } = await client
        .from('ingredients')
        .select('*')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching ingredients:', error);
        return [];
    }

    return (data ?? []) as Ingredient[];
}

export async function fetchIngredientById(client: KitchenClient, id: string): Promise<Ingredient | null> {
    const { data, error } = await client
        .from('ingredients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching ingredient by ID:', error);
        return null;
    }

    return (data ?? null) as Ingredient | null;
}

export async function fetchComponents(
    client: KitchenClient,
    restaurantId: string
): Promise<RecipeComponent[]> {
    const { data, error } = await client
        .from('components')
        .select(COMPONENTS_SELECT)
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching components:', error);
        return [];
    }

    return (data ?? []) as RecipeComponent[];
}

export async function fetchComponentById(
    client: KitchenClient,
    id: string
): Promise<RecipeComponent | null> {
    const { data, error } = await client
        .from('components')
        .select(COMPONENTS_SELECT)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('[fetchComponentById] Error for ID:', id, '→', error.message, error.code, error.details);
        return null;
    }

    return (data ?? null) as RecipeComponent | null;
}

export async function fetchComponentOptions(
    client: KitchenClient,
    restaurantId: string
): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await client
        .from('components')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching component options:', error);
        return [];
    }

    return (data ?? []) as Array<{ id: string; name: string }>;
}

export async function fetchMenus(
    client: KitchenClient,
    restaurantId: string,
    options?: FetchMenusOptions
): Promise<Menu[]> {
    const { data, error } = await client
        .from('menus')
        .select(buildMenusSelect(options))
        .eq('restaurant_id', restaurantId)
        .order('name');

    if (error) {
        console.error('Error fetching menus:', error);
        return [];
    }

    return ((data ?? []) as unknown) as Menu[];
}

export async function fetchMenuById(
    client: KitchenClient,
    id: string
): Promise<Menu | null> {
    const { data, error } = await client
        .from('menus')
        .select(buildMenusSelect({ includeMenuComponents: true }))
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching menu by ID:', error);
        return null;
    }

    return ((data ?? null) as unknown) as Menu | null;
}

export async function fetchIngredientsListData(client: KitchenClient, restaurantId: string) {
    const [ingredients, components] = await Promise.all([
        fetchIngredients(client),
        fetchComponents(client, restaurantId),
    ]);

    return {
        ingredients,
        components,
    };
}

export async function fetchComponentsListData(client: KitchenClient, restaurantId: string) {
    const [components, menus] = await Promise.all([
        fetchComponents(client, restaurantId),
        fetchMenus(client, restaurantId, {
            includeMenuComponents: true,
            includeComponentDetails: true,
        }),
    ]);

    return {
        components,
        menus,
    };
}

export async function fetchComponentEditorData(client: KitchenClient, componentId: string) {
    const [component, ingredients] = await Promise.all([
        fetchComponentById(client, componentId),
        fetchIngredients(client),
    ]);

    return {
        component,
        ingredients,
    };
}
