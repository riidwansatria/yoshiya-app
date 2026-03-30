'use client';

import { Menu } from '@/lib/queries/menus';
import { deleteMenu } from '@/lib/actions/menus';
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

export function DeleteMenuDialog({
    menu,
    open,
    onOpenChange,
}: {
    menu: Menu;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations('kitchen');
    async function onSubmit() {
        const result = await deleteMenu(menu.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('menus.deleted'));
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('menus.deleteTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('menus.deleteDescription', { name: menu.name })}
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
