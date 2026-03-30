'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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

function stopDialogFormPropagation(event: FormEvent<HTMLFormElement>) {
    event.stopPropagation();
}

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
    const t = useTranslations('kitchen');
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
            toast.error(t('components.quickCreate.nameRequired'));
            return;
        }
        if (yieldServings <= 0) {
            toast.error(t('components.quickCreate.yieldPositive'));
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

            toast.success(t('components.quickCreate.created'));

            if (res.data) {
                // Pass the new full component object back to the parent
                onSuccess(res.data as RecipeComponent);
            }

            onOpenChange(false);
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : t('components.quickCreate.createFailed'));
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('components.quickCreate.title')}</DialogTitle>
                    <DialogDescription>
                        {t('components.quickCreate.description')}
                    </DialogDescription>
                </DialogHeader>
                <form
                    onSubmit={(event) => {
                        stopDialogFormPropagation(event);
                        event.preventDefault();
                        void handleSave();
                    }}
                >
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="component-name">{t('common.name')}</Label>
                            <Input
                                id="component-name"
                                placeholder={t('components.placeholders.name')}
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="component-yield">{t('components.quickCreate.yield')}</Label>
                            <Input
                                id="component-yield"
                                type="number"
                                min="1"
                                value={yieldServings}
                                onChange={(e) => setYieldServings(parseInt(e.target.value) || 1)}
                            />
                            <p className="text-xs text-muted-foreground">{t('components.quickCreate.yieldHint')}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            {t('common.cancel')}
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? t('components.quickCreate.creating') : t('components.quickCreate.create')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
