'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { Ingredient } from '@/lib/queries/ingredients';
import { IngredientEditor } from './ingredient-editor';

export function IngredientEditorPage({
    ingredient,
    restaurantId,
}: {
    ingredient: Ingredient;
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();
    const backHref = `/dashboard/${restaurantId}/ingredients`;

    const handleClose = () => {
        router.push(backHref);
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-16">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('ingredients.editTitle')}</h2>
            </div>
            <div className="flex max-w-2xl flex-col space-y-8">
                <div className="rounded-md border p-6">
                    <IngredientEditor
                        ingredient={ingredient}
                        presentation="page"
                        onCancel={handleClose}
                        onSaved={handleClose}
                    />
                </div>
            </div>
        </div>
    );
}
