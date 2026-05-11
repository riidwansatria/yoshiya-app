import { notFound } from 'next/navigation';

import { IngredientEditorPage } from '@/components/kitchen/ingredient-editor-page';
import { getDistinctCategories, getIngredientById } from '@/lib/queries/ingredients';
import { getVendors } from '@/lib/queries/vendors';

export default async function IngredientDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const [ingredient, vendors, categories] = await Promise.all([
        getIngredientById(id),
        getVendors(),
        getDistinctCategories(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorPage ingredient={ingredient} vendors={vendors} categories={categories} restaurantId={restaurant} />;
}
