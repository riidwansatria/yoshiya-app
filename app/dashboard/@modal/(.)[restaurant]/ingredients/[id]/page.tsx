import { notFound } from 'next/navigation';

import { IngredientEditorModal } from '@/components/kitchen/ingredient-editor-modal';
import { getDistinctCategories, getIngredientById } from '@/lib/queries/ingredients';
import { getVendors } from '@/lib/queries/vendors';

export default async function IngredientModalRoute({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [ingredient, vendors, categories] = await Promise.all([
        getIngredientById(id),
        getVendors(),
        getDistinctCategories(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorModal ingredient={ingredient} vendors={vendors} categories={categories} />;
}
