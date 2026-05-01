import type { SupabaseClient } from '@supabase/supabase-js';

import type { Ingredient, Menu, MenuTag, RecipeComponent } from '@/lib/types/kitchen';

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
    includeTags?: boolean;
}

export function buildMenusSelect({
    includeMenuComponents = false,
    includeComponentDetails = false,
    includeTags = false,
}: FetchMenusOptions = {}) {
    const baseSelect = 'id, restaurant_id, name, season, price, description, color, image_url, tax_rate, is_public';
    const parts = [baseSelect];

    if (includeMenuComponents) {
        const componentSelect = includeComponentDetails ? ', components (id, name)' : '';
        parts.push(`menu_components (menu_id, component_id, qty_per_order${componentSelect})`);
    }

    if (includeTags) {
        parts.push('menu_tag_assignments (menu_tags (id, label, label_en, kind, created_at, updated_at))');
    }

    return parts.join(', ');
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

export async function fetchDistinctStores(client: KitchenClient): Promise<string[]> {
    const { data, error } = await client
        .from('ingredients')
        .select('store')
        .not('store', 'is', null)
        .order('store', { ascending: true });

    if (error) {
        console.error('Error fetching distinct stores:', error);
        return [];
    }

    const unique = [
        ...new Set(
            (data ?? [])
                .map((row: { store: string }) => row.store?.trim())
                .filter((store): store is string => Boolean(store))
        ),
    ];
    return unique;
}

export async function fetchDistinctCategories(client: KitchenClient): Promise<string[]> {
    const { data, error } = await client
        .from('ingredients')
        .select('category')
        .not('category', 'is', null)
        .order('category', { ascending: true });

    if (error) {
        console.error('Error fetching distinct categories:', error);
        return [];
    }

    const unique = [
        ...new Set(
            (data ?? [])
                .map((row: { category: string }) => row.category?.trim())
                .filter((category): category is string => Boolean(category))
        ),
    ];
    return unique;
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

// Circled numbers ①–⑳ (U+2460–U+2473), ㉑–㉟ (U+3251–U+325F), ㊱–㊿ (U+32B1–U+32BF)
const CIRCLED_NUMBERS = [
    ...Array.from({ length: 20 }, (_, i) => String.fromCodePoint(0x2460 + i)),
    ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x3251 + i)),
    ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x32B1 + i)),
]

function circledNumberIndex(name: string): number {
    const idx = CIRCLED_NUMBERS.findIndex(c => name.startsWith(c))
    return idx === -1 ? Infinity : idx
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

    if (error) {
        console.error('Error fetching menus:', error);
        return [];
    }

    const menus = ((data ?? []) as unknown) as MenuWithNestedTags[];

    const sorted = [...menus].sort(
        (a, b) => circledNumberIndex(a.name) - circledNumberIndex(b.name)
    )

    if (!options?.includeTags) {
        return sorted;
    }

    return sorted.map(normalizeNestedTags);
}

export async function fetchMenuById(
    client: KitchenClient,
    id: string
): Promise<Menu | null> {
    const { data, error } = await client
        .from('menus')
        .select(buildMenusSelect({ includeMenuComponents: true, includeTags: true }))
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Error fetching menu by ID:', error);
        return null;
    }

    const menu = ((data ?? null) as unknown) as MenuWithNestedTags | null;

    if (!menu) {
        return null;
    }

    return normalizeNestedTags(menu);
}

export async function fetchMenuTags(client: KitchenClient): Promise<MenuTag[]> {
    const { data, error } = await client
        .from('menu_tags')
        .select('id, label, label_en, kind, created_at, updated_at')
        .order('label', { ascending: true });

    if (error) {
        console.error('Error fetching menu tags:', error);
        return [];
    }

    return (data ?? []) as MenuTag[];
}

type NestedTagAssignment = {
    menu_tags: MenuTag[] | MenuTag | null;
};

type MenuWithNestedTags = Menu & {
    menu_tag_assignments?: NestedTagAssignment[] | null;
};

function normalizeNestedTags(menu: MenuWithNestedTags): Menu {
    const assignments = Array.isArray(menu.menu_tag_assignments) ? menu.menu_tag_assignments : [];

    const tags = assignments.flatMap((assignment) => {
        if (Array.isArray(assignment.menu_tags)) return assignment.menu_tags;
        return assignment.menu_tags ? [assignment.menu_tags] : [];
    });

    const { menu_tag_assignments: _unused, ...rest } = menu;
    void _unused;

    return {
        ...rest,
        tags: tags.sort((a, b) => a.label.localeCompare(b.label)),
    };
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
