export interface Ingredient {
    id: string;
    name: string;
    unit: string;
    category: string | null;
    store: string | null;
    package_size: number | null;
    package_label: string | null;
    created_at: string;
}

export interface ComponentOption {
    id: string;
    name: string;
}

export interface ComponentIngredient {
    component_id: string;
    ingredient_id: string;
    qty_per_serving: number;
    ingredients?: Ingredient;
}

export interface RecipeComponent {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    yield_servings: number;
    created_at: string;
    component_ingredients?: ComponentIngredient[];
}

export type MenuTagKind = 'dietary' | 'ingredient' | 'season';

export interface MenuTag {
    id: string;
    label: string;
    label_en: string | null;
    kind: MenuTagKind;
    created_at: string | null;
    updated_at: string | null;
}

export interface MenuComponentReference {
    id: string;
    name: string;
}

export interface MenuComponent {
    menu_id: string;
    component_id: string;
    qty_per_order: number;
    components?: MenuComponentReference | null;
}

export interface Menu {
    id: string;
    restaurant_id: string;
    name: string;
    name_en: string | null;
    price: number | null;
    description: string | null;
    staff_memo: string | null;
    color: string | null;
    image_url: string | null;
    tax_rate: number;
    is_public: boolean;
    menu_components?: MenuComponent[];
    tags?: MenuTag[];
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

export interface DailyOrder {
    id: string;
    restaurant_id: string;
    target_date: string;
    menu_id: string;
    quantity: number;
    notes: string | null;
    created_at: string;
    menu?: Menu;
}
