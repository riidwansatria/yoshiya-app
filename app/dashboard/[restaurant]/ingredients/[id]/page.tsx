import { notFound } from 'next/navigation';

import { IngredientEditorPage } from '@/components/kitchen/ingredient-editor-page';
import { getIngredientById, getDistinctStores } from '@/lib/queries/ingredients';

export default async function IngredientDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const [ingredient, stores] = await Promise.all([
        getIngredientById(id),
        getDistinctStores(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorPage ingredient={ingredient} stores={stores} restaurantId={restaurant} />;
}
