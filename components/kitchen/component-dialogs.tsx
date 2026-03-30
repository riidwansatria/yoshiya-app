'use client';

import { RecipeComponent } from '@/lib/queries/components';
import { deleteComponent } from '@/lib/actions/components';
import { useTranslations } from 'next-intl';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function DeleteComponentDialog({
    component,
    open,
    onOpenChange,
}: {
    component: RecipeComponent;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations('kitchen');
    async function onSubmit() {
        const result = await deleteComponent(component.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('components.deleted'));
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('components.deleteTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('components.deleteDescription', { name: component.name })}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        {t('common.cancel')}
                    </Button>
                    <Button variant="destructive" onClick={onSubmit}>
                        {t('common.delete')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
