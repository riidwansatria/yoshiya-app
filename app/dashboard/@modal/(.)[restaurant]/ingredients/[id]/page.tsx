import { notFound } from 'next/navigation';

import { IngredientEditorModal } from '@/components/kitchen/ingredient-editor-modal';
import { getIngredientById } from '@/lib/queries/ingredients';

export default async function IngredientModalRoute({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    const ingredient = await getIngredientById(id);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorModal ingredient={ingredient} />;
}
