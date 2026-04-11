export type IngredientPayload = {
    name: string;
    unit: string;
    category?: string | null;
    store?: string | null;
    package_size?: number | null;
    package_label?: string | null;
}

export function normalizeIngredientPayload(data: IngredientPayload) {
    const packageSize = data.package_size ?? null

    return {
        name: data.name.trim(),
        unit: data.unit.trim(),
        category: data.category?.trim() ? data.category.trim() : null,
        store: data.store?.trim() ? data.store.trim() : null,
        package_size: packageSize,
        package_label: data.package_label?.trim() ? data.package_label.trim() : null,
    }
}

export function validateIngredientPayload(data: ReturnType<typeof normalizeIngredientPayload>) {
    if (!data.name) {
        return 'Ingredient name is required'
    }

    if (data.package_size !== null && data.package_size <= 0) {
        return 'Package size must be greater than 0'
    }

    return null
}
