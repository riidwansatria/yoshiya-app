import { notFound } from 'next/navigation';

import { IngredientEditorModal } from '@/components/kitchen/ingredient-editor-modal';
import { getDistinctCategories, getDistinctStores, getIngredientById } from '@/lib/queries/ingredients';

export default async function IngredientModalRoute({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const [ingredient, stores, categories] = await Promise.all([
        getIngredientById(id),
        getDistinctStores(),
        getDistinctCategories(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorModal ingredient={ingredient} stores={stores} categories={categories} />;
}
