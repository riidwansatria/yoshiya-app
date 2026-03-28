'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { createComponent } from '@/lib/actions/components';
import { RecipeComponent } from '@/lib/queries/components';
import { toast } from 'sonner';

export function AddComponentDialogInline({
    open,
    onOpenChange,
    restaurantId,
    initialName = '',
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    restaurantId: string;
    initialName?: string;
    onSuccess: (newComponent: RecipeComponent) => void;
}) {
    const [name, setName] = useState(initialName);
    const [yieldServings, setYieldServings] = useState(1);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!open) {
            setName('');
            setYieldServings(1);
            return;
        }

        setName(initialName);
        setYieldServings(1);
    }, [initialName, open]);

    async function handleSave() {
        if (!name.trim()) {
            toast.error('Component name is required');
            return;
        }
        if (yieldServings <= 0) {
            toast.error('Yield servings must be greater than 0');
            return;
        }

        setIsSaving(true);
        try {
            const res = await createComponent({
                restaurant_id: restaurantId,
                name: name.trim(),
                yield_servings: yieldServings,
            });

            if (res.error) throw new Error(res.error);

            toast.success('Component created successfully');

            if (res.data) {
                // Pass the new full component object back to the parent
                onSuccess(res.data as RecipeComponent);
            }

            onOpenChange(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to create component');
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Quick Create Component</DialogTitle>
                    <DialogDescription>
                        Create a new component here to assign to your menu. You can add the specific ingredients to this component later from the Components tab.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="component-name">Name</Label>
                        <Input
                            id="component-name"
                            placeholder="e.g. Dashi"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="component-yield">Yield (Servings)</Label>
                        <Input
                            id="component-yield"
                            type="number"
                            min="1"
                            value={yieldServings}
                            onChange={(e) => setYieldServings(parseInt(e.target.value) || 1)}
                        />
                        <p className="text-xs text-muted-foreground">Standard output of a single prep batch.</p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? 'Creating...' : 'Create Component'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
