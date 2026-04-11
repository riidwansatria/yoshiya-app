import { notFound } from 'next/navigation';

import { IngredientEditorPage } from '@/components/kitchen/ingredient-editor-page';
import { getDistinctCategories, getDistinctStores, getIngredientById } from '@/lib/queries/ingredients';

export default async function IngredientDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const [ingredient, stores, categories] = await Promise.all([
        getIngredientById(id),
        getDistinctStores(),
        getDistinctCategories(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorPage ingredient={ingredient} stores={stores} categories={categories} restaurantId={restaurant} />;
}
