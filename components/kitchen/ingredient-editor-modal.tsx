'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { Ingredient } from '@/lib/queries/ingredients';
import { IngredientEditor } from './ingredient-editor';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function IngredientEditorModal({
    ingredient,
    stores,
}: {
    ingredient: Ingredient;
    stores: string[];
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();

    const handleClose = () => {
        router.back();
    };

    return (
        <Dialog open onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('ingredients.editTitle')}</DialogTitle>
                </DialogHeader>
                <IngredientEditor
                    ingredient={ingredient}
                    stores={stores}
                    presentation="modal"
                    onCancel={handleClose}
                    onSaved={handleClose}
                />
            </DialogContent>
        </Dialog>
    );
}
