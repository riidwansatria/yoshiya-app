'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import type { Ingredient } from '@/lib/queries/ingredients';
import type { Vendor } from '@/lib/queries/vendors';
import { IngredientEditor } from './ingredient-editor';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export function IngredientEditorModal({
    ingredient,
    vendors,
    categories,
}: {
    ingredient: Ingredient;
    vendors: Vendor[];
    categories: string[];
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
                    <DialogDescription className="sr-only">
                        {t('ingredients.editDescription')}
                    </DialogDescription>
                </DialogHeader>
                <IngredientEditor
                    ingredient={ingredient}
                    vendors={vendors}
                    categories={categories}
                    presentation="modal"
                    onCancel={handleClose}
                    onSaved={handleClose}
                />
            </DialogContent>
        </Dialog>
    );
}
