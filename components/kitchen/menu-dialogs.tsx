'use client';

import { Menu } from '@/lib/queries/menus';
import { deleteMenu } from '@/lib/actions/menus';
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
    async function onSubmit() {
        const result = await deleteMenu(menu.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Menu deleted');
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Menu</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{menu.name}</strong>? This will remove the mapped components from this menu, but it will not delete the components themselves. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onSubmit}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
