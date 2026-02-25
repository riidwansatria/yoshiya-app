'use client';

import { RecipeComponent } from '@/lib/queries/components';
import { deleteComponent } from '@/lib/actions/components';
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
    async function onSubmit() {
        const result = await deleteComponent(component.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Component deleted');
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Component</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{component.name}</strong>? This action cannot be
                        undone.
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
