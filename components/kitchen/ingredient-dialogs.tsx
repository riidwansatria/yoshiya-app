'use client';

import { type FormEvent, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { Ingredient } from '@/lib/queries/ingredients';
import { createIngredient, updateIngredient, deleteIngredient } from '@/lib/actions/ingredients';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    unit: z.string(),
    category: z.string().optional(),
    package_size: z.string().optional().refine((value) => {
        const trimmed = (value ?? '').trim();

        return trimmed === '' || (!Number.isNaN(Number(trimmed)) && Number(trimmed) > 0);
    }, 'Package size must be greater than 0'),
    package_label: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function stopDialogFormPropagation(event: FormEvent<HTMLFormElement>) {
    event.stopPropagation();
}

export function AddIngredientDialog({
    open,
    onOpenChange,
    initialName = '',
    onSuccess,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialName?: string;
    onSuccess?: (ingredient: Ingredient) => void;
}) {
    const t = useTranslations('kitchen');
    const [isSaving, setIsSaving] = useState(false);
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: initialName,
            unit: '',
            category: '',
            package_size: '',
            package_label: '',
        },
    });

    // Sync name field whenever dialog opens with a new initialName
    useEffect(() => {
        if (open) {
            form.reset({
                name: initialName,
                unit: '',
                category: '',
                package_size: '',
                package_label: '',
            });
        }
    }, [open, initialName, form]);

    async function onSubmit(data: FormValues) {
        if (isSaving) return;
        setIsSaving(true);
        try {
            const trimmedPackageSize = data.package_size?.trim() ?? '';
            const result = await createIngredient({
                name: data.name,
                unit: data.unit,
                category: data.category,
                package_size: trimmedPackageSize ? Number(trimmedPackageSize) : null,
                package_label: data.package_label,
            });
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(t('ingredients.added'));
                form.reset();
                onOpenChange(false);
                if (result.data && onSuccess) {
                    onSuccess(result.data as Ingredient);
                }
            }
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('ingredients.addTitle')}</DialogTitle>
                    <DialogDescription>{t('ingredients.addDescription')}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={(event) => {
                            stopDialogFormPropagation(event);
                            void form.handleSubmit(onSubmit)(event);
                        }}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('common.name')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('ingredients.placeholders.name')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ingredients.unitOptional')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('ingredients.placeholders.unit')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ingredients.categoryOptional')}</FormLabel>
                                    <FormControl>
                                        <Input placeholder={t('ingredients.placeholders.category')} {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="package_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('ingredients.packageSizeOptional')}</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="any"
                                                placeholder={t('ingredients.placeholders.packageSize')}
                                                {...field}
                                            />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            {t('ingredients.packageSizeHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="package_label"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('ingredients.packageLabelOptional')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('ingredients.placeholders.packageLabel')} {...field} />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            {t('ingredients.packageLabelHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? t('common.saving') : t('ingredients.saveButton')}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function EditIngredientDialog({
    ingredient,
    open,
    onOpenChange,
}: {
    ingredient: Ingredient;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations('kitchen');
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category || '',
            package_size: ingredient.package_size?.toString() || '',
            package_label: ingredient.package_label || '',
        },
    });

    async function onSubmit(data: FormValues) {
        const trimmedPackageSize = data.package_size?.trim() ?? '';
        const result = await updateIngredient(ingredient.id, {
            name: data.name,
            unit: data.unit,
            category: data.category,
            package_size: trimmedPackageSize ? Number(trimmedPackageSize) : null,
            package_label: data.package_label,
        });
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('ingredients.updated'));
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('ingredients.editTitle')}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form
                        onSubmit={(event) => {
                            stopDialogFormPropagation(event);
                            void form.handleSubmit(onSubmit)(event);
                        }}
                        className="space-y-4"
                    >
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('common.name')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="unit"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('ingredients.unitOptional')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('common.category')}</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="package_size"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('ingredients.packageSizeOptional')}</FormLabel>
                                        <FormControl>
                                            <Input type="number" min="0" step="any" {...field} />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            {t('ingredients.packageSizeHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="package_label"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('ingredients.packageLabelOptional')}</FormLabel>
                                        <FormControl>
                                            <Input placeholder={t('ingredients.placeholders.packageLabel')} {...field} />
                                        </FormControl>
                                        <p className="text-xs text-muted-foreground">
                                            {t('ingredients.packageLabelHint')}
                                        </p>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">{t('ingredients.saveChanges')}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export function DeleteIngredientDialog({
    ingredient,
    open,
    onOpenChange,
}: {
    ingredient: Ingredient;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const t = useTranslations('kitchen');
    async function onSubmit() {
        const result = await deleteIngredient(ingredient.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success(t('ingredients.deleted'));
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('ingredients.deleteTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('ingredients.deleteDescription', { name: ingredient.name })}
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
