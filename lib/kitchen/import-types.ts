export const KITCHEN_IMPORT_SCHEMA_VERSION = 1 as const;

export const KITCHEN_IMPORT_FILE_NAMES = [
    'ingredients.csv',
    'components.csv',
    'menus.csv',
    'component_ingredients.csv',
    'menu_components.csv',
] as const;

export type KitchenImportFileName = (typeof KITCHEN_IMPORT_FILE_NAMES)[number];
export type KitchenImportSeverity = 'error' | 'warning' | 'info';

export interface KitchenImportIssue {
    severity: KitchenImportSeverity;
    code: string;
    file?: string;
    row?: number;
    field?: string;
    message: string;
}

export interface KitchenImportOperation {
    entity:
        | 'ingredient'
        | 'component'
        | 'menu'
        | 'component_ingredient'
        | 'menu_component';
    action: 'create' | 'update' | 'set' | 'remove';
    ref: string;
    relatedRef?: string;
    label: string;
    relatedLabel?: string;
    current: Record<string, unknown> | null;
    proposed: Record<string, unknown> | null;
    file: KitchenImportFileName;
    row: number;
}

export interface IngredientImportOperation {
    action: 'create' | 'update';
    ref: string;
    version: string | null;
    update_fields: string[];
    values: {
        name: string;
        unit: string;
        category: string;
        vendor_id: string;
        package_size: string;
        package_label: string;
    };
}

export interface ComponentImportOperation {
    action: 'create' | 'update';
    ref: string;
    version: string | null;
    update_fields: string[];
    values: {
        name: string;
        description: string;
        yield_servings: string;
    };
}

export interface MenuImportOperation {
    action: 'create' | 'update';
    ref: string;
    version: string | null;
    update_fields: string[];
    values: {
        name: string;
        name_en: string;
        price: string;
        description: string;
        staff_memo: string;
        color: string;
        is_public: string;
    };
    tag_ids: string[];
}

export interface ComponentIngredientImportOperation {
    action: 'set' | 'remove';
    component_ref: string;
    ingredient_ref: string;
    batch_quantity: string;
    relationship_version: string | null;
}

export interface MenuComponentImportOperation {
    action: 'set' | 'remove';
    menu_ref: string;
    component_ref: string;
    quantity_per_menu_order: string;
    relationship_version: string | null;
}

export interface KitchenImportPayload {
    ingredients: IngredientImportOperation[];
    components: ComponentImportOperation[];
    menus: MenuImportOperation[];
    component_ingredients: ComponentIngredientImportOperation[];
    menu_components: MenuComponentImportOperation[];
}

export interface KitchenImportCounts {
    creates: number;
    updates: number;
    relationshipSets: number;
    relationshipRemovals: number;
    warnings: number;
    errors: number;
}

export interface KitchenImportPreview {
    previewId: string | null;
    digest: string | null;
    expiresAt: string | null;
    restaurantId: string;
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    counts: KitchenImportCounts;
    canApply: boolean;
}

export interface KitchenImportApplyResult {
    success: boolean;
    run_id: string;
    counts: Record<string, number>;
    temp_ref_mapping: Record<string, string>;
}

export interface KitchenImportManifest {
    schema_version: typeof KITCHEN_IMPORT_SCHEMA_VERSION;
    exported_at: string;
    restaurant: {
        id: string;
        name: string;
    };
    counts: {
        ingredients: number;
        components: number;
        menus: number;
        component_ingredients: number;
        menu_components: number;
    };
    allowed_vendors: Array<{ ref: string; name: string }>;
    allowed_menu_tags: Array<{
        ref: string;
        label: string;
        label_en: string | null;
        kind: string;
    }>;
}
