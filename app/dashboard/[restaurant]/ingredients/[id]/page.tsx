import { notFound } from 'next/navigation';

import { IngredientEditorPage } from '@/components/kitchen/ingredient-editor-page';
import { getIngredientById } from '@/lib/queries/ingredients';

export default async function IngredientDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const ingredient = await getIngredientById(id);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorPage ingredient={ingredient} restaurantId={restaurant} />;
}
