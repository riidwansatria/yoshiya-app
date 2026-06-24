import 'server-only';

import { createHash } from 'node:crypto';

import { canAccess, type UserAccess } from '@/lib/auth/access-control';
import { createClient } from '@/lib/supabase/server';
import {
    decodeSpreadsheetText,
    hasUnsafeFormulaPrefix,
    normalizeImportKey,
    parseCsvRecords,
} from '@/lib/kitchen/import-csv';
import { KITCHEN_IMPORT_HEADERS } from '@/lib/kitchen/import-pack';
import {
    KITCHEN_IMPORT_FILE_NAMES,
    KITCHEN_IMPORT_SCHEMA_VERSION,
    type ComponentImportOperation,
    type ComponentIngredientImportOperation,
    type IngredientImportOperation,
    type KitchenImportCounts,
    type KitchenImportFileName,
    type KitchenImportIssue,
    type KitchenImportManifest,
    type KitchenImportOperation,
    type KitchenImportPayload,
    type MenuComponentImportOperation,
    type MenuImportOperation,
} from '@/lib/kitchen/import-types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMP_REF_RE = /^new:[a-z0-9]+(?:-[a-z0-9]+)*$/;

const INGREDIENT_FIELDS = new Set(['name', 'unit', 'category', 'vendor', 'package_size', 'package_label']);
const COMPONENT_FIELDS = new Set(['name', 'description', 'yield_servings']);
const MENU_FIELDS = new Set([
    'name',
    'name_en',
    'price',
    'description',
    'staff_memo',
    'color',
    'is_public',
    'tag_labels_json',
]);

type CsvRecord = Record<string, string>;
type CurrentIngredient = {
    id: string;
    name: string;
    unit: string;
    category: string | null;
    vendor_id: string | null;
    package_size: number | null;
    package_label: string | null;
    updated_at: string;
};
type CurrentComponent = {
    id: string;
    restaurant_id: string;
    name: string;
    description: string | null;
    yield_servings: number;
    updated_at: string;
};
type CurrentMenu = {
    id: string;
    restaurant_id: string;
    name: string;
    name_en: string | null;
    price: number | null;
    description: string | null;
    staff_memo: string | null;
    color: string | null;
    is_public: boolean;
    updated_at: string;
    menu_tag_assignments: Array<{ menu_tags: { id: string; label: string } | { id: string; label: string }[] | null }>;
};
type CurrentComponentIngredient = {
    component_id: string;
    ingredient_id: string;
    batch_quantity: number;
    updated_at: string;
};
type CurrentMenuComponent = {
    menu_id: string;
    component_id: string;
    qty_per_order: number;
    updated_at: string;
};

export interface ValidatedKitchenImport {
    restaurantId: string;
    sourceDigest: string;
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    counts: KitchenImportCounts;
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
}

export async function validateKitchenImportFiles({
    restaurantId,
    files,
    access,
}: {
    restaurantId: string;
    files: Partial<Record<KitchenImportFileName | 'manifest.json', string>>;
    access: UserAccess;
}): Promise<ValidatedKitchenImport> {
    const issues: KitchenImportIssue[] = [];
    const parsed = new Map<KitchenImportFileName, CsvRecord[]>();
    const sourceDigest = createSourceDigest(files);

    validateManifest(files['manifest.json'], restaurantId, issues);

    for (const fileName of KITCHEN_IMPORT_FILE_NAMES) {
        const text = files[fileName];
        if (text === undefined) continue;
        const result = parseCsvRecords({
            fileName,
            csvText: text,
            expectedHeaders: [...KITCHEN_IMPORT_HEADERS[fileName]],
        });
        parsed.set(fileName, result.records);
        issues.push(...result.issues);
    }

    const current = await loadCurrentState(restaurantId);
    issues.push(...current.issues);

    const payload: KitchenImportPayload = {
        ingredients: [],
        components: [],
        menus: [],
        component_ingredients: [],
        menu_components: [],
    };
    const operations: KitchenImportOperation[] = [];
    const beforeSnapshot: Record<string, unknown> = {};
    const afterSnapshot: Record<string, unknown> = {};

    const ingredientById = new Map(current.ingredients.map((row) => [row.id, row]));
    const componentById = new Map(current.components.map((row) => [row.id, row]));
    const menuById = new Map(current.menus.map((row) => [row.id, row]));
    const vendorById = new Map(current.vendors.map((row) => [row.id, row]));
    const vendorsByName = groupByNormalizedName(current.vendors);
    const tagsByName = groupByNormalizedName(current.tags.map((tag) => ({ ...tag, name: tag.label })));
    const tempRefTypes = new Map<string, 'ingredient' | 'component' | 'menu'>();

    parseIngredientOperations({
        rows: parsed.get('ingredients.csv') ?? [],
        payload,
        operations,
        issues,
        beforeSnapshot,
        afterSnapshot,
        ingredientById,
        vendorById,
        vendorsByName,
        tempRefTypes,
    });
    parseComponentOperations({
        rows: parsed.get('components.csv') ?? [],
        payload,
        operations,
        issues,
        beforeSnapshot,
        afterSnapshot,
        componentById,
        tempRefTypes,
    });
    parseMenuOperations({
        rows: parsed.get('menus.csv') ?? [],
        payload,
        operations,
        issues,
        beforeSnapshot,
        afterSnapshot,
        menuById,
        tagsByName,
        tempRefTypes,
    });

    validateFinalNames({
        currentIngredients: current.ingredients,
        currentComponents: current.components,
        currentMenus: current.menus,
        payload,
        issues,
    });

    parseComponentIngredientOperations({
        rows: parsed.get('component_ingredients.csv') ?? [],
        payload,
        operations,
        issues,
        beforeSnapshot,
        afterSnapshot,
        ingredientById,
        componentById,
        relationships: current.componentIngredients,
        tempRefTypes,
    });
    parseMenuComponentOperations({
        rows: parsed.get('menu_components.csv') ?? [],
        payload,
        operations,
        issues,
        beforeSnapshot,
        afterSnapshot,
        menuById,
        componentById,
        relationships: current.menuComponents,
        tempRefTypes,
    });

    validatePermissions(payload, access, issues);

    const counts = countPreview(operations, issues);
    return {
        restaurantId,
        sourceDigest,
        payload,
        operations,
        issues,
        counts,
        beforeSnapshot,
        afterSnapshot,
    };
}

function validateManifest(text: string | undefined, restaurantId: string, issues: KitchenImportIssue[]) {
    if (!text) return;
    try {
        const manifest = JSON.parse(text) as KitchenImportManifest;
        if (manifest.schema_version !== KITCHEN_IMPORT_SCHEMA_VERSION) {
            addIssue(issues, 'error', 'unsupported-schema', 'Unsupported kitchen import schema version.', 'manifest.json');
        }
        if (manifest.restaurant?.id !== restaurantId) {
            addIssue(issues, 'error', 'restaurant-mismatch', 'The data pack belongs to another restaurant.', 'manifest.json');
        }
    } catch {
        addIssue(issues, 'error', 'invalid-manifest', 'manifest.json is not valid JSON.', 'manifest.json');
    }
}

async function loadCurrentState(restaurantId: string) {
    const supabase = await createClient();
    const [restaurant, ingredients, components, menus, componentIngredients, menuComponents, vendors, tags] =
        await Promise.all([
            supabase.from('restaurants').select('id').eq('id', restaurantId).maybeSingle(),
            supabase.from('ingredients').select('id, name, unit, category, vendor_id, package_size, package_label, updated_at'),
            supabase
                .from('components')
                .select('id, restaurant_id, name, description, yield_servings, updated_at')
                .eq('restaurant_id', restaurantId),
            supabase
                .from('menus')
                .select('id, restaurant_id, name, name_en, price, description, staff_memo, color, is_public, updated_at, menu_tag_assignments(menu_tags(id, label))')
                .eq('restaurant_id', restaurantId),
            supabase.from('component_ingredients').select('component_id, ingredient_id, batch_quantity, updated_at'),
            supabase.from('menu_components').select('menu_id, component_id, qty_per_order, updated_at'),
            supabase.from('vendors').select('id, name'),
            supabase.from('menu_tags').select('id, label'),
        ]);
    const issues: KitchenImportIssue[] = [];
    const firstError = [
        restaurant.error,
        ingredients.error,
        components.error,
        menus.error,
        componentIngredients.error,
        menuComponents.error,
        vendors.error,
        tags.error,
    ].find(Boolean);
    if (firstError) {
        addIssue(issues, 'error', 'database-read-failed', firstError.message);
    }
    if (!restaurant.data) {
        addIssue(issues, 'error', 'restaurant-not-found', 'Selected restaurant was not found.');
    }
    return {
        ingredients: (ingredients.data ?? []) as CurrentIngredient[],
        components: (components.data ?? []) as CurrentComponent[],
        menus: (menus.data ?? []) as unknown as CurrentMenu[],
        componentIngredients: (componentIngredients.data ?? []) as CurrentComponentIngredient[],
        menuComponents: (menuComponents.data ?? []) as CurrentMenuComponent[],
        vendors: vendors.data ?? [],
        tags: tags.data ?? [],
        issues,
    };
}

function parseIngredientOperations(args: {
    rows: CsvRecord[];
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
    ingredientById: Map<string, CurrentIngredient>;
    vendorById: Map<string, { id: string; name: string }>;
    vendorsByName: Map<string, Array<{ id: string; name: string }>>;
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>;
}) {
    const seenRefs = new Set<string>();
    args.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const action = row.action.toLowerCase();
        if (!action) {
            warnIfBlankIngredientChanged(row, rowNumber, args.ingredientById, args.issues);
            return;
        }
        if (action !== 'create' && action !== 'update') {
            addIssue(args.issues, 'error', 'invalid-action', 'Ingredient action must be create, update, or blank.', 'ingredients.csv', rowNumber, 'action');
            return;
        }
        if (seenRefs.has(row.ref)) {
            addIssue(args.issues, 'error', 'duplicate-ref', `Duplicate ingredient ref: ${row.ref}`, 'ingredients.csv', rowNumber, 'ref');
            return;
        }
        seenRefs.add(row.ref);
        const updateFields = parseUpdateFields(row.update_fields, INGREDIENT_FIELDS, action, 'ingredients.csv', rowNumber, args.issues);
        const existing = action === 'update' ? args.ingredientById.get(row.ref) : undefined;
        validateMasterRef(action, row.ref, existing, 'ingredient', 'ingredients.csv', rowNumber, args.tempRefTypes, args.issues);
        validateVersion(action, row.version, existing?.updated_at, 'ingredients.csv', rowNumber, args.issues);

        const name = safeText(row.name, 'ingredients.csv', rowNumber, 'name', args.issues);
        const unit = safeText(row.unit, 'ingredients.csv', rowNumber, 'unit', args.issues);
        const category = safeText(row.category, 'ingredients.csv', rowNumber, 'category', args.issues);
        const packageLabel = safeText(row.package_label, 'ingredients.csv', rowNumber, 'package_label', args.issues);
        if ((action === 'create' || updateFields.includes('name')) && !name) {
            addIssue(args.issues, 'error', 'required-field', 'Ingredient name is required.', 'ingredients.csv', rowNumber, 'name');
        }
        if (!unit) {
            addIssue(args.issues, 'warning', 'blank-unit', 'Ingredient unit is blank.', 'ingredients.csv', rowNumber, 'unit');
        }
        const packageSize =
            action === 'create' || updateFields.includes('package_size')
                ? parseOptionalPositiveNumber(row.package_size, 'ingredients.csv', rowNumber, 'package_size', args.issues)
                : row.package_size;
        const vendorId =
            action === 'create' || updateFields.includes('vendor')
                ? resolveVendor(row, args.vendorById, args.vendorsByName, rowNumber, args.issues)
                : row.vendor_ref;
        const operation: IngredientImportOperation = {
            action,
            ref: row.ref,
            version: action === 'update' ? row.version : null,
            update_fields: updateFields,
            values: {
                name,
                unit,
                category,
                vendor_id: vendorId,
                package_size: packageSize,
                package_label: packageLabel,
            },
        };
        args.payload.ingredients.push(operation);
        pushMasterPreview('ingredient', operation, existing ?? null, rowNumber, args.operations, args.beforeSnapshot, args.afterSnapshot);
    });
}

function parseComponentOperations(args: {
    rows: CsvRecord[];
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
    componentById: Map<string, CurrentComponent>;
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>;
}) {
    const seenRefs = new Set<string>();
    args.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const action = row.action.toLowerCase();
        if (!action) {
            warnIfBlankMasterChanged(row, rowNumber, args.componentById.get(row.ref), ['name', 'description', 'yield_servings'], 'components.csv', args.issues);
            return;
        }
        if (action !== 'create' && action !== 'update') {
            addIssue(args.issues, 'error', 'invalid-action', 'Component action must be create, update, or blank.', 'components.csv', rowNumber, 'action');
            return;
        }
        if (seenRefs.has(row.ref)) {
            addIssue(args.issues, 'error', 'duplicate-ref', `Duplicate component ref: ${row.ref}`, 'components.csv', rowNumber, 'ref');
            return;
        }
        seenRefs.add(row.ref);
        const updateFields = parseUpdateFields(row.update_fields, COMPONENT_FIELDS, action, 'components.csv', rowNumber, args.issues);
        const existing = action === 'update' ? args.componentById.get(row.ref) : undefined;
        validateMasterRef(action, row.ref, existing, 'component', 'components.csv', rowNumber, args.tempRefTypes, args.issues);
        validateVersion(action, row.version, existing?.updated_at, 'components.csv', rowNumber, args.issues);
        const name = safeText(row.name, 'components.csv', rowNumber, 'name', args.issues);
        const description = safeText(row.description, 'components.csv', rowNumber, 'description', args.issues);
        if ((action === 'create' || updateFields.includes('name')) && !name) {
            addIssue(args.issues, 'error', 'required-field', 'Component name is required.', 'components.csv', rowNumber, 'name');
        }
        const yieldServings =
            action === 'create' || updateFields.includes('yield_servings')
                ? parsePositiveInteger(row.yield_servings, 'components.csv', rowNumber, 'yield_servings', args.issues)
                : row.yield_servings;
        const operation: ComponentImportOperation = {
            action,
            ref: row.ref,
            version: action === 'update' ? row.version : null,
            update_fields: updateFields,
            values: { name, description, yield_servings: yieldServings },
        };
        args.payload.components.push(operation);
        pushMasterPreview('component', operation, existing ?? null, rowNumber, args.operations, args.beforeSnapshot, args.afterSnapshot);
    });
}

function parseMenuOperations(args: {
    rows: CsvRecord[];
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
    menuById: Map<string, CurrentMenu>;
    tagsByName: Map<string, Array<{ id: string; name: string }>>;
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>;
}) {
    const seenRefs = new Set<string>();
    args.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const action = row.action.toLowerCase();
        if (!action) {
            warnIfBlankMenuChanged(row, rowNumber, args.menuById.get(row.ref), args.issues);
            return;
        }
        if (action !== 'create' && action !== 'update') {
            addIssue(args.issues, 'error', 'invalid-action', 'Menu action must be create, update, or blank.', 'menus.csv', rowNumber, 'action');
            return;
        }
        if (seenRefs.has(row.ref)) {
            addIssue(args.issues, 'error', 'duplicate-ref', `Duplicate menu ref: ${row.ref}`, 'menus.csv', rowNumber, 'ref');
            return;
        }
        seenRefs.add(row.ref);
        const updateFields = parseUpdateFields(row.update_fields, MENU_FIELDS, action, 'menus.csv', rowNumber, args.issues);
        const existing = action === 'update' ? args.menuById.get(row.ref) : undefined;
        validateMasterRef(action, row.ref, existing, 'menu', 'menus.csv', rowNumber, args.tempRefTypes, args.issues);
        validateVersion(action, row.version, existing?.updated_at, 'menus.csv', rowNumber, args.issues);
        const name = safeText(row.name, 'menus.csv', rowNumber, 'name', args.issues);
        const nameEn = safeText(row.name_en, 'menus.csv', rowNumber, 'name_en', args.issues);
        const description = safeText(row.description, 'menus.csv', rowNumber, 'description', args.issues);
        const staffMemo = safeText(row.staff_memo, 'menus.csv', rowNumber, 'staff_memo', args.issues);
        const color = safeText(row.color, 'menus.csv', rowNumber, 'color', args.issues);
        if ((action === 'create' || updateFields.includes('name')) && !name) {
            addIssue(args.issues, 'error', 'required-field', 'Menu name is required.', 'menus.csv', rowNumber, 'name');
        }
        const price =
            action === 'create' || updateFields.includes('price')
                ? parseOptionalNonNegativeInteger(row.price, 'menus.csv', rowNumber, 'price', args.issues)
                : row.price;
        const isPublic =
            action === 'create' || updateFields.includes('is_public')
                ? parseBoolean(row.is_public, action === 'create', 'menus.csv', rowNumber, 'is_public', args.issues)
                : row.is_public;
        const tagIds =
            action === 'create' || updateFields.includes('tag_labels_json')
                ? parseTagIds(row.tag_labels_json, args.tagsByName, rowNumber, args.issues)
                : [];
        const operation: MenuImportOperation = {
            action,
            ref: row.ref,
            version: action === 'update' ? row.version : null,
            update_fields: updateFields,
            values: {
                name,
                name_en: nameEn,
                price,
                description,
                staff_memo: staffMemo,
                color,
                is_public: isPublic,
            },
            tag_ids: tagIds,
        };
        args.payload.menus.push(operation);
        pushMasterPreview('menu', operation, existing ?? null, rowNumber, args.operations, args.beforeSnapshot, args.afterSnapshot);
    });
}

function parseComponentIngredientOperations(args: {
    rows: CsvRecord[];
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
    ingredientById: Map<string, CurrentIngredient>;
    componentById: Map<string, CurrentComponent>;
    relationships: CurrentComponentIngredient[];
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>;
}) {
    const relationshipByKey = new Map(args.relationships.map((row) => [`${row.component_id}:${row.ingredient_id}`, row]));
    const seen = new Set<string>();
    args.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const action = row.action.toLowerCase();
        if (!action) {
            const current = relationshipByKey.get(`${row.component_ref}:${row.ingredient_ref}`);
            if (current && String(current.batch_quantity) !== row.batch_quantity) {
                addIssue(args.issues, 'warning', 'blank-action-edited', 'This quantity differs but the blank action means no change.', 'component_ingredients.csv', rowNumber);
            }
            return;
        }
        if (action !== 'set' && action !== 'remove') {
            addIssue(args.issues, 'error', 'invalid-action', 'Relationship action must be set, remove, or blank.', 'component_ingredients.csv', rowNumber, 'action');
            return;
        }
        const key = `${row.component_ref}:${row.ingredient_ref}`;
        if (seen.has(key)) {
            addIssue(args.issues, 'error', 'duplicate-relationship', 'Duplicate component/ingredient operation.', 'component_ingredients.csv', rowNumber);
            return;
        }
        seen.add(key);
        validateTypedRef(row.component_ref, 'component', args.componentById, args.tempRefTypes, 'component_ingredients.csv', rowNumber, args.issues);
        validateTypedRef(row.ingredient_ref, 'ingredient', args.ingredientById, args.tempRefTypes, 'component_ingredients.csv', rowNumber, args.issues);
        const current = relationshipByKey.get(key);
        validateRelationshipVersion(action, row.relationship_version, current?.updated_at, 'component_ingredients.csv', rowNumber, args.issues);
        const quantity = action === 'set'
            ? parsePositiveNumber(row.batch_quantity, 'component_ingredients.csv', rowNumber, 'batch_quantity', args.issues)
            : '';
        if (action === 'remove' && row.batch_quantity) {
            addIssue(args.issues, 'error', 'remove-has-quantity', 'Remove rows must leave batch_quantity blank.', 'component_ingredients.csv', rowNumber, 'batch_quantity');
        }
        const operation: ComponentIngredientImportOperation = {
            action,
            component_ref: row.component_ref,
            ingredient_ref: row.ingredient_ref,
            batch_quantity: quantity,
            relationship_version: row.relationship_version || null,
        };
        args.payload.component_ingredients.push(operation);
        pushRelationshipPreview('component_ingredient', operation, current ?? null, row.component_name, row.ingredient_name, rowNumber, 'component_ingredients.csv', args.operations, args.beforeSnapshot, args.afterSnapshot);
    });
}

function parseMenuComponentOperations(args: {
    rows: CsvRecord[];
    payload: KitchenImportPayload;
    operations: KitchenImportOperation[];
    issues: KitchenImportIssue[];
    beforeSnapshot: Record<string, unknown>;
    afterSnapshot: Record<string, unknown>;
    menuById: Map<string, CurrentMenu>;
    componentById: Map<string, CurrentComponent>;
    relationships: CurrentMenuComponent[];
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>;
}) {
    const relationshipByKey = new Map(args.relationships.map((row) => [`${row.menu_id}:${row.component_id}`, row]));
    const seen = new Set<string>();
    args.rows.forEach((row, index) => {
        const rowNumber = index + 2;
        const action = row.action.toLowerCase();
        if (!action) {
            const current = relationshipByKey.get(`${row.menu_ref}:${row.component_ref}`);
            if (current && String(current.qty_per_order) !== row.quantity_per_menu_order) {
                addIssue(args.issues, 'warning', 'blank-action-edited', 'This quantity differs but the blank action means no change.', 'menu_components.csv', rowNumber);
            }
            return;
        }
        if (action !== 'set' && action !== 'remove') {
            addIssue(args.issues, 'error', 'invalid-action', 'Relationship action must be set, remove, or blank.', 'menu_components.csv', rowNumber, 'action');
            return;
        }
        const key = `${row.menu_ref}:${row.component_ref}`;
        if (seen.has(key)) {
            addIssue(args.issues, 'error', 'duplicate-relationship', 'Duplicate menu/component operation.', 'menu_components.csv', rowNumber);
            return;
        }
        seen.add(key);
        validateTypedRef(row.menu_ref, 'menu', args.menuById, args.tempRefTypes, 'menu_components.csv', rowNumber, args.issues);
        validateTypedRef(row.component_ref, 'component', args.componentById, args.tempRefTypes, 'menu_components.csv', rowNumber, args.issues);
        const current = relationshipByKey.get(key);
        validateRelationshipVersion(action, row.relationship_version, current?.updated_at, 'menu_components.csv', rowNumber, args.issues);
        const quantity = action === 'set'
            ? parsePositiveNumber(row.quantity_per_menu_order, 'menu_components.csv', rowNumber, 'quantity_per_menu_order', args.issues)
            : '';
        if (action === 'remove' && row.quantity_per_menu_order) {
            addIssue(args.issues, 'error', 'remove-has-quantity', 'Remove rows must leave quantity blank.', 'menu_components.csv', rowNumber, 'quantity_per_menu_order');
        }
        const operation: MenuComponentImportOperation = {
            action,
            menu_ref: row.menu_ref,
            component_ref: row.component_ref,
            quantity_per_menu_order: quantity,
            relationship_version: row.relationship_version || null,
        };
        args.payload.menu_components.push(operation);
        pushRelationshipPreview('menu_component', operation, current ?? null, row.menu_name, row.component_name, rowNumber, 'menu_components.csv', args.operations, args.beforeSnapshot, args.afterSnapshot);
    });
}

function validateFinalNames(args: {
    currentIngredients: CurrentIngredient[];
    currentComponents: CurrentComponent[];
    currentMenus: CurrentMenu[];
    payload: KitchenImportPayload;
    issues: KitchenImportIssue[];
}) {
    validateNameSet(
        args.currentIngredients.map((row) => ({ ref: row.id, name: row.name })),
        args.payload.ingredients,
        'ingredients.csv',
        args.issues
    );
    validateNameSet(
        args.currentComponents.map((row) => ({ ref: row.id, name: row.name })),
        args.payload.components,
        'components.csv',
        args.issues
    );
    validateNameSet(
        args.currentMenus.map((row) => ({ ref: row.id, name: row.name })),
        args.payload.menus,
        'menus.csv',
        args.issues
    );
}

function validateNameSet(
    current: Array<{ ref: string; name: string }>,
    operations: Array<IngredientImportOperation | ComponentImportOperation | MenuImportOperation>,
    file: KitchenImportFileName,
    issues: KitchenImportIssue[]
) {
    const finalNames = new Map(current.map((row) => [row.ref, row.name]));
    for (const operation of operations) {
        if (operation.action === 'create' || operation.update_fields.includes('name')) {
            finalNames.set(operation.ref, operation.values.name);
        }
    }
    const byName = new Map<string, string[]>();
    for (const [ref, name] of finalNames) {
        if (!name) continue;
        const key = normalizeImportKey(name);
        byName.set(key, [...(byName.get(key) ?? []), ref]);
    }
    for (const refs of byName.values()) {
        if (refs.length > 1) {
            addIssue(issues, 'error', 'duplicate-name', `Duplicate normalized name across refs: ${refs.join(', ')}`, file);
        }
    }
}

function validatePermissions(payload: KitchenImportPayload, access: UserAccess, issues: KitchenImportIssue[]) {
    const needsKitchen =
        payload.ingredients.length > 0 ||
        payload.components.length > 0 ||
        payload.component_ingredients.length > 0;
    const needsMenuCreate = payload.menus.some((row) => row.action === 'create');
    const needsMenuUpdate =
        payload.menus.some((row) => row.action === 'update') ||
        payload.menus.some((row) => row.action === 'create' && row.tag_ids.length > 0) ||
        payload.menu_components.length > 0;
    if (needsKitchen && !canAccess(access, 'kitchen', 'kitchen.update')) {
        addIssue(issues, 'error', 'missing-permission', 'Missing kitchen.update permission.');
    }
    if (needsMenuCreate && !canAccess(access, 'menus', 'menus.create')) {
        addIssue(issues, 'error', 'missing-permission', 'Missing menus.create permission.');
    }
    if (needsMenuUpdate && !canAccess(access, 'menus', 'menus.update')) {
        addIssue(issues, 'error', 'missing-permission', 'Missing menus.update permission.');
    }
}

function validateMasterRef(
    action: 'create' | 'update',
    ref: string,
    existing: unknown,
    type: 'ingredient' | 'component' | 'menu',
    file: KitchenImportFileName,
    row: number,
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>,
    issues: KitchenImportIssue[]
) {
    if (action === 'create') {
        if (!TEMP_REF_RE.test(ref)) {
            addIssue(
                issues,
                'error',
                'invalid-temp-ref',
                'Create refs must use lowercase ASCII letters, numbers, and hyphens, for example new:teriyaki-sauce. Japanese is allowed in name, but not ref.',
                file,
                row,
                'ref'
            );
            return;
        }
        if (tempRefTypes.has(ref)) {
            addIssue(issues, 'error', 'duplicate-temp-ref', `Temporary ref is reused: ${ref}`, file, row, 'ref');
            return;
        }
        tempRefTypes.set(ref, type);
        return;
    }
    if (!UUID_RE.test(ref) || !existing) {
        addIssue(issues, 'error', 'unknown-ref', `Unknown ${type} ref: ${ref}`, file, row, 'ref');
    }
}

function validateTypedRef(
    ref: string,
    type: 'ingredient' | 'component' | 'menu',
    existing: Map<string, unknown>,
    tempRefTypes: Map<string, 'ingredient' | 'component' | 'menu'>,
    file: KitchenImportFileName,
    row: number,
    issues: KitchenImportIssue[]
) {
    if (ref.startsWith('new:')) {
        if (tempRefTypes.get(ref) !== type) {
            addIssue(issues, 'error', 'unknown-temp-ref', `Unknown ${type} temporary ref: ${ref}`, file, row);
        }
        return;
    }
    if (!UUID_RE.test(ref) || !existing.has(ref)) {
        addIssue(issues, 'error', 'unknown-ref', `Unknown ${type} ref: ${ref}`, file, row);
    }
}

function validateVersion(
    action: 'create' | 'update',
    submitted: string,
    current: string | undefined,
    file: KitchenImportFileName,
    row: number,
    issues: KitchenImportIssue[]
) {
    if (action === 'create' && submitted) {
        addIssue(issues, 'error', 'create-has-version', 'Create rows must leave version blank.', file, row, 'version');
    }
    if (action === 'update' && (!submitted || submitted !== current)) {
        addIssue(issues, 'error', 'stale-version', 'This record changed after the data pack was exported.', file, row, 'version');
    }
}

function validateRelationshipVersion(
    action: 'set' | 'remove',
    submitted: string,
    current: string | undefined,
    file: KitchenImportFileName,
    row: number,
    issues: KitchenImportIssue[]
) {
    if (action === 'remove' && !current) {
        addIssue(issues, 'error', 'missing-relationship', 'Cannot remove a relationship that does not exist.', file, row);
        return;
    }
    if (current && submitted !== current) {
        addIssue(issues, 'error', 'stale-version', 'This relationship changed after export.', file, row, 'relationship_version');
    }
    if (!current && submitted) {
        addIssue(issues, 'error', 'unexpected-version', 'New relationships must leave relationship_version blank.', file, row, 'relationship_version');
    }
}

function parseUpdateFields(
    value: string,
    allowed: Set<string>,
    action: 'create' | 'update',
    file: KitchenImportFileName,
    row: number,
    issues: KitchenImportIssue[]
) {
    const fields = value.split('|').map((field) => field.trim()).filter(Boolean);
    if (action === 'create' && fields.length > 0) {
        addIssue(issues, 'error', 'create-update-fields', 'Create rows must leave update_fields blank.', file, row, 'update_fields');
    }
    if (action === 'update' && fields.length === 0) {
        addIssue(issues, 'error', 'missing-update-fields', 'Update rows must list update_fields.', file, row, 'update_fields');
    }
    if (new Set(fields).size !== fields.length) {
        addIssue(issues, 'error', 'duplicate-update-field', 'update_fields contains duplicates.', file, row, 'update_fields');
    }
    for (const field of fields) {
        if (!allowed.has(field)) {
            addIssue(issues, 'error', 'unknown-update-field', `Unsupported update field: ${field}`, file, row, 'update_fields');
        }
    }
    return fields;
}

function resolveVendor(
    row: CsvRecord,
    vendorById: Map<string, { id: string; name: string }>,
    vendorsByName: Map<string, Array<{ id: string; name: string }>>,
    rowNumber: number,
    issues: KitchenImportIssue[]
) {
    if (row.vendor_ref) {
        const vendor = vendorById.get(row.vendor_ref);
        if (!vendor) {
            addIssue(issues, 'error', 'unknown-vendor', `Unknown vendor ref: ${row.vendor_ref}`, 'ingredients.csv', rowNumber, 'vendor_ref');
            return '';
        }
        if (row.vendor_name && normalizeImportKey(row.vendor_name) !== normalizeImportKey(vendor.name)) {
            addIssue(issues, 'error', 'vendor-mismatch', 'vendor_ref and vendor_name identify different vendors.', 'ingredients.csv', rowNumber);
        }
        return vendor.id;
    }
    if (!row.vendor_name) return '';
    const matches = vendorsByName.get(normalizeImportKey(row.vendor_name)) ?? [];
    if (matches.length !== 1) {
        addIssue(issues, 'error', 'unknown-vendor', `Vendor must match one existing vendor: ${row.vendor_name}`, 'ingredients.csv', rowNumber, 'vendor_name');
        return '';
    }
    return matches[0].id;
}

function parseTagIds(
    value: string,
    tagsByName: Map<string, Array<{ id: string; name: string }>>,
    row: number,
    issues: KitchenImportIssue[]
) {
    if (!value) return [];
    let labels: unknown;
    try {
        labels = JSON.parse(value);
    } catch {
        addIssue(issues, 'error', 'invalid-tags-json', 'tag_labels_json must be a JSON string array.', 'menus.csv', row, 'tag_labels_json');
        return [];
    }
    if (!Array.isArray(labels) || labels.some((label) => typeof label !== 'string')) {
        addIssue(issues, 'error', 'invalid-tags-json', 'tag_labels_json must contain only strings.', 'menus.csv', row, 'tag_labels_json');
        return [];
    }
    const tagIds: string[] = [];
    for (const label of labels) {
        const matches = tagsByName.get(normalizeImportKey(label)) ?? [];
        if (matches.length !== 1) {
            addIssue(issues, 'error', 'unknown-tag', `Unknown menu tag: ${label}`, 'menus.csv', row, 'tag_labels_json');
            continue;
        }
        tagIds.push(matches[0].id);
    }
    return [...new Set(tagIds)];
}

function safeText(
    value: string,
    file: KitchenImportFileName,
    row: number,
    field: string,
    issues: KitchenImportIssue[]
) {
    if (value.startsWith("'") && hasUnsafeFormulaPrefix(value.slice(1))) {
        return decodeSpreadsheetText(value);
    }
    if (hasUnsafeFormulaPrefix(value)) {
        addIssue(issues, 'error', 'formula-injection', 'Formula-like text must be escaped with a leading apostrophe.', file, row, field);
    }
    return value;
}

function parsePositiveInteger(value: string, file: KitchenImportFileName, row: number, field: string, issues: KitchenImportIssue[]) {
    const number = Number(value);
    if (!Number.isInteger(number) || number <= 0) {
        addIssue(issues, 'error', 'invalid-positive-integer', `${field} must be a positive integer.`, file, row, field);
        return '1';
    }
    return String(number);
}

function parsePositiveNumber(value: string, file: KitchenImportFileName, row: number, field: string, issues: KitchenImportIssue[]) {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) {
        addIssue(issues, 'error', 'invalid-positive-number', `${field} must be greater than zero.`, file, row, field);
        return '1';
    }
    return String(number);
}

function parseOptionalPositiveNumber(value: string, file: KitchenImportFileName, row: number, field: string, issues: KitchenImportIssue[]) {
    if (!value) return '';
    return parsePositiveNumber(value, file, row, field, issues);
}

function parseOptionalNonNegativeInteger(value: string, file: KitchenImportFileName, row: number, field: string, issues: KitchenImportIssue[]) {
    if (!value) return '';
    const number = Number(value);
    if (!Number.isInteger(number) || number < 0) {
        addIssue(issues, 'error', 'invalid-price', 'price must be blank or a non-negative integer.', file, row, field);
        return '';
    }
    return String(number);
}

function parseBoolean(
    value: string,
    required: boolean,
    file: KitchenImportFileName,
    row: number,
    field: string,
    issues: KitchenImportIssue[]
) {
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized === 'false') return normalized;
    if (!value && !required) return '';
    addIssue(issues, 'error', 'invalid-boolean', `${field} must be true or false.`, file, row, field);
    return 'true';
}

function warnIfBlankIngredientChanged(
    row: CsvRecord,
    rowNumber: number,
    currentById: Map<string, CurrentIngredient>,
    issues: KitchenImportIssue[]
) {
    const current = currentById.get(row.ref);
    if (!current) return;
    const differs =
        row.name !== current.name ||
        row.unit !== current.unit ||
        row.category !== (current.category ?? '') ||
        row.package_size !== String(current.package_size ?? '') ||
        row.package_label !== (current.package_label ?? '') ||
        row.vendor_ref !== (current.vendor_id ?? '');
    if (differs) {
        addIssue(issues, 'warning', 'blank-action-edited', 'This row differs but its blank action means no change.', 'ingredients.csv', rowNumber);
    }
}

function warnIfBlankMenuChanged(
    row: CsvRecord,
    rowNumber: number,
    current: CurrentMenu | undefined,
    issues: KitchenImportIssue[]
) {
    if (!current) return;
    const labels = current.menu_tag_assignments.flatMap((assignment) => {
        if (Array.isArray(assignment.menu_tags)) {
            return assignment.menu_tags.map((tag) => tag.label);
        }
        return assignment.menu_tags ? [assignment.menu_tags.label] : [];
    });
    const differs =
        ['name', 'name_en', 'price', 'description', 'staff_memo', 'color', 'is_public'].some(
            (field) => String(row[field] ?? '') !== String(current[field as keyof CurrentMenu] ?? '')
        ) ||
        row.tag_labels_json !== JSON.stringify(labels.sort((a, b) => a.localeCompare(b)));
    if (differs) {
        addIssue(issues, 'warning', 'blank-action-edited', 'This row differs but its blank action means no change.', 'menus.csv', rowNumber);
    }
}

function warnIfBlankMasterChanged(
    row: CsvRecord,
    rowNumber: number,
    current: Record<string, unknown> | undefined,
    fields: string[],
    file: KitchenImportFileName,
    issues: KitchenImportIssue[]
) {
    if (!current) return;
    const differs = fields.some((field) => String(row[field] ?? '') !== String(current[field] ?? ''));
    if (differs) {
        addIssue(issues, 'warning', 'blank-action-edited', 'This row differs but its blank action means no change.', file, rowNumber);
    }
}

function pushMasterPreview(
    entity: 'ingredient' | 'component' | 'menu',
    operation: IngredientImportOperation | ComponentImportOperation | MenuImportOperation,
    current: Record<string, unknown> | null,
    row: number,
    operations: KitchenImportOperation[],
    before: Record<string, unknown>,
    after: Record<string, unknown>
) {
    const proposed = { ...operation.values, ...('tag_ids' in operation ? { tag_ids: operation.tag_ids } : {}) };
    operations.push({
        entity,
        action: operation.action,
        ref: operation.ref,
        label: operation.values.name,
        current,
        proposed,
        file: `${entity === 'ingredient' ? 'ingredients' : entity === 'component' ? 'components' : 'menus'}.csv`,
        row,
    });
    before[`${entity}:${operation.ref}`] = current;
    after[`${entity}:${operation.ref}`] = proposed;
}

function pushRelationshipPreview(
    entity: 'component_ingredient' | 'menu_component',
    operation: ComponentIngredientImportOperation | MenuComponentImportOperation,
    current: Record<string, unknown> | null,
    label: string,
    relatedLabel: string,
    row: number,
    file: 'component_ingredients.csv' | 'menu_components.csv',
    operations: KitchenImportOperation[],
    before: Record<string, unknown>,
    after: Record<string, unknown>
) {
    const isComponentIngredient = 'ingredient_ref' in operation;
    const ref = isComponentIngredient ? operation.component_ref : operation.menu_ref;
    const relatedRef = isComponentIngredient ? operation.ingredient_ref : operation.component_ref;
    const proposed = operation.action === 'remove' ? null : { ...operation };
    operations.push({
        entity,
        action: operation.action,
        ref,
        relatedRef,
        label,
        relatedLabel,
        current,
        proposed,
        file,
        row,
    });
    const key = `${entity}:${ref}:${relatedRef}`;
    before[key] = current;
    after[key] = proposed;
}

function groupByNormalizedName<T extends { id: string; name: string }>(rows: T[]) {
    const map = new Map<string, T[]>();
    for (const row of rows) {
        const key = normalizeImportKey(row.name);
        map.set(key, [...(map.get(key) ?? []), row]);
    }
    return map;
}

function countPreview(operations: KitchenImportOperation[], issues: KitchenImportIssue[]): KitchenImportCounts {
    return {
        creates: operations.filter((row) => row.action === 'create').length,
        updates: operations.filter((row) => row.action === 'update').length,
        relationshipSets: operations.filter((row) => row.action === 'set').length,
        relationshipRemovals: operations.filter((row) => row.action === 'remove').length,
        warnings: issues.filter((issue) => issue.severity === 'warning').length,
        errors: issues.filter((issue) => issue.severity === 'error').length,
    };
}

function createSourceDigest(files: Partial<Record<string, string>>) {
    const hash = createHash('sha256');
    for (const [name, contents] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
        if (contents === undefined) continue;
        hash.update(name);
        hash.update('\0');
        hash.update(contents);
        hash.update('\0');
    }
    return hash.digest('hex');
}

function addIssue(
    issues: KitchenImportIssue[],
    severity: KitchenImportIssue['severity'],
    code: string,
    message: string,
    file?: string,
    row?: number,
    field?: string
) {
    issues.push({ severity, code, message, file, row, field });
}
