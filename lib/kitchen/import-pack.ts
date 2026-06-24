import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { stringifyCsv } from '@/lib/kitchen/import-csv';
import {
    KITCHEN_IMPORT_SCHEMA_VERSION,
    type KitchenImportManifest,
} from '@/lib/kitchen/import-types';

const INGREDIENT_HEADERS = [
    'action',
    'update_fields',
    'ref',
    'version',
    'name',
    'unit',
    'category',
    'vendor_ref',
    'vendor_name',
    'package_size',
    'package_label',
];

const COMPONENT_HEADERS = [
    'action',
    'update_fields',
    'ref',
    'version',
    'name',
    'description',
    'yield_servings',
];

const MENU_HEADERS = [
    'action',
    'update_fields',
    'ref',
    'version',
    'name',
    'name_en',
    'price',
    'description',
    'staff_memo',
    'color',
    'is_public',
    'tag_labels_json',
];

const COMPONENT_INGREDIENT_HEADERS = [
    'action',
    'component_ref',
    'component_name',
    'component_version',
    'ingredient_ref',
    'ingredient_name',
    'ingredient_unit',
    'batch_quantity',
    'relationship_version',
];

const MENU_COMPONENT_HEADERS = [
    'action',
    'menu_ref',
    'menu_name',
    'menu_version',
    'component_ref',
    'component_name',
    'quantity_per_menu_order',
    'relationship_version',
];

export const KITCHEN_IMPORT_HEADERS = {
    'ingredients.csv': INGREDIENT_HEADERS,
    'components.csv': COMPONENT_HEADERS,
    'menus.csv': MENU_HEADERS,
    'component_ingredients.csv': COMPONENT_INGREDIENT_HEADERS,
    'menu_components.csv': MENU_COMPONENT_HEADERS,
} as const;

type NestedTag = { menu_tags: { label: string } | { label: string }[] | null };
type PackComponentRelationship = {
    ingredient_id: string;
    batch_quantity: number;
    updated_at: string;
    ingredients: { id: string; name: string; unit: string } | { id: string; name: string; unit: string }[] | null;
};
type PackMenuRelationship = {
    component_id: string;
    qty_per_order: number;
    updated_at: string;
    components: { id: string; name: string } | { id: string; name: string }[] | null;
};

export async function buildKitchenImportPack(restaurantId: string) {
    const supabase = await createClient();
    const [
        restaurantResult,
        ingredientsResult,
        componentsResult,
        menusResult,
        vendorsResult,
        tagsResult,
    ] = await Promise.all([
        supabase.from('restaurants').select('id, name').eq('id', restaurantId).maybeSingle(),
        supabase.from('ingredients').select('*').order('name'),
        supabase
            .from('components')
            .select('*, component_ingredients(component_id, ingredient_id, batch_quantity, updated_at, ingredients(id, name, unit))')
            .eq('restaurant_id', restaurantId)
            .order('name'),
        supabase
            .from('menus')
            .select('*, menu_components(menu_id, component_id, qty_per_order, updated_at, components(id, name)), menu_tag_assignments(menu_tags(label))')
            .eq('restaurant_id', restaurantId)
            .order('name'),
        supabase.from('vendors').select('id, name').order('name'),
        supabase.from('menu_tags').select('id, label, label_en, kind').order('label'),
    ]);

    const error = [
        restaurantResult.error,
        ingredientsResult.error,
        componentsResult.error,
        menusResult.error,
        vendorsResult.error,
        tagsResult.error,
    ].find(Boolean);

    if (error) {
        throw new Error(error.message);
    }
    if (!restaurantResult.data) {
        throw new Error('Restaurant not found');
    }

    const ingredients = ingredientsResult.data ?? [];
    const components = componentsResult.data ?? [];
    const menus = menusResult.data ?? [];
    const vendors = vendorsResult.data ?? [];
    const tags = tagsResult.data ?? [];
    const vendorNameById = new Map(vendors.map((vendor) => [vendor.id, vendor.name]));

    const ingredientRows = ingredients.map((ingredient) => ({
        action: '',
        update_fields: '',
        ref: ingredient.id,
        version: ingredient.updated_at,
        name: ingredient.name,
        unit: ingredient.unit,
        category: ingredient.category ?? '',
        vendor_ref: ingredient.vendor_id ?? '',
        vendor_name: ingredient.vendor_id ? vendorNameById.get(ingredient.vendor_id) ?? '' : '',
        package_size: ingredient.package_size ?? '',
        package_label: ingredient.package_label ?? '',
    }));

    const componentRows = components.map((component) => ({
        action: '',
        update_fields: '',
        ref: component.id,
        version: component.updated_at,
        name: component.name,
        description: component.description ?? '',
        yield_servings: component.yield_servings,
    }));

    const menuRows = menus.map((menu) => {
        const assignments = (menu.menu_tag_assignments ?? []) as NestedTag[];
        const tagLabels = assignments.flatMap((assignment) => {
            if (Array.isArray(assignment.menu_tags)) {
                return assignment.menu_tags.map((tag) => tag.label);
            }
            return assignment.menu_tags ? [assignment.menu_tags.label] : [];
        });

        return {
            action: '',
            update_fields: '',
            ref: menu.id,
            version: menu.updated_at,
            name: menu.name,
            name_en: menu.name_en ?? '',
            price: menu.price ?? '',
            description: menu.description ?? '',
            staff_memo: menu.staff_memo ?? '',
            color: menu.color ?? '',
            is_public: String(menu.is_public),
            tag_labels_json: JSON.stringify(tagLabels.sort((a, b) => a.localeCompare(b))),
        };
    });

    const componentIngredientRows = components.flatMap((component) =>
        ((component.component_ingredients ?? []) as PackComponentRelationship[]).map((relationship) => {
            const ingredient = Array.isArray(relationship.ingredients)
                ? relationship.ingredients[0]
                : relationship.ingredients;
            return {
                action: '',
                component_ref: component.id,
                component_name: component.name,
                component_version: component.updated_at,
                ingredient_ref: relationship.ingredient_id,
                ingredient_name: ingredient?.name ?? '',
                ingredient_unit: ingredient?.unit ?? '',
                batch_quantity: relationship.batch_quantity,
                relationship_version: relationship.updated_at,
            };
        })
    );

    const menuComponentRows = menus.flatMap((menu) =>
        ((menu.menu_components ?? []) as PackMenuRelationship[]).map((relationship) => {
            const component = Array.isArray(relationship.components)
                ? relationship.components[0]
                : relationship.components;
            return {
                action: '',
                menu_ref: menu.id,
                menu_name: menu.name,
                menu_version: menu.updated_at,
                component_ref: relationship.component_id,
                component_name: component?.name ?? '',
                quantity_per_menu_order: relationship.qty_per_order,
                relationship_version: relationship.updated_at,
            };
        })
    );

    const manifest: KitchenImportManifest = {
        schema_version: KITCHEN_IMPORT_SCHEMA_VERSION,
        exported_at: new Date().toISOString(),
        restaurant: restaurantResult.data,
        counts: {
            ingredients: ingredientRows.length,
            components: componentRows.length,
            menus: menuRows.length,
            component_ingredients: componentIngredientRows.length,
            menu_components: menuComponentRows.length,
        },
        allowed_vendors: vendors.map((vendor) => ({ ref: vendor.id, name: vendor.name })),
        allowed_menu_tags: tags.map((tag) => ({
            ref: tag.id,
            label: tag.label,
            label_en: tag.label_en,
            kind: tag.kind,
        })),
    };

    return {
        manifest,
        files: {
            'README.md': buildReadme(restaurantResult.data.name),
            'manifest.json': JSON.stringify(manifest, null, 2),
            'ingredients.csv': stringifyCsv(INGREDIENT_HEADERS, ingredientRows),
            'components.csv': stringifyCsv(COMPONENT_HEADERS, componentRows),
            'menus.csv': stringifyCsv(MENU_HEADERS, menuRows),
            'component_ingredients.csv': stringifyCsv(COMPONENT_INGREDIENT_HEADERS, componentIngredientRows),
            'menu_components.csv': stringifyCsv(MENU_COMPONENT_HEADERS, menuComponentRows),
        },
    };
}

function buildReadme(restaurantName: string) {
    return `# Yoshiya Kitchen Data Pack

Restaurant: ${restaurantName}
Schema version: ${KITCHEN_IMPORT_SCHEMA_VERSION}

## Data model

Ingredient -> used by a Component recipe -> used by a Menu

## Editing instructions

Edit these Yoshiya kitchen CSV files according to my instructions. Preserve all headers, refs, versions, and unchanged rows. For existing master records, set action=update and list only intentionally changed fields in update_fields. For new records, use unique new:* refs containing only lowercase ASCII letters, numbers, and hyphens. Japanese is allowed in name fields, but not in ref fields. For relationship changes, use set or remove explicitly. Never invent vendor or menu-tag names. Return all files as valid UTF-8 CSV.

## Actions

- Blank action: informational only; the row is ignored.
- ingredients/components/menus: create or update.
- component_ingredients/menu_components: set or remove.
- Missing files or rows never delete anything.
- Master records cannot be deleted.

## Update fields

For an update, list only fields that should change, separated by |.
Example: name|price|description

If a listed nullable field is blank, it is cleared. Fields not listed remain unchanged.

## New references

Use a unique lowercase temporary reference such as new:teriyaki-sauce.
Relationship files may use those temporary references in the same import.
Temporary refs may contain only ASCII letters a-z, numbers 0-9, and hyphens.
Keep Japanese text in the name column, for example ref=new:ingredient-buns and name=バンズ.

## Examples

- Update package size: action=update, update_fields=package_size|package_label.
- Create ingredient: action=create, ref=new:rice-vinegar.
- Create component: action=create, ref=new:teriyaki-sauce, then add set rows in component_ingredients.csv.
- Create menu: action=create, ref=new:teriyaki-menu, then add set rows in menu_components.csv.
- Remove a relationship: action=remove. This never deletes either master record.
- Clear a description: action=update, update_fields=description, leave description blank.

## Do not

- Rename or reorder headers.
- Change UUID refs or version values.
- Infer deletion from missing rows.
- Invent tags, vendors, units, or quantities when uncertain.
- Put formulas in cells.
- Use Japanese or other non-ASCII characters in new:* refs.
- Use unescaped text beginning with =, +, -, or @. Prefix such text with an apostrophe, for example '-.
`;
}
