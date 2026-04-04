'use client';

import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
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
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { fetchIngredientById } from '@/lib/queries/kitchen';
import { subscribeToKitchenScope } from '@/lib/realtime/kitchen';
import { mergeUntouchedFields } from '@/lib/kitchen/realtime-merge';
import { RealtimeSyncBanner } from './realtime-sync-banner';

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
const INGREDIENT_SYNC_FIELDS = ['name', 'unit', 'category', 'package_size', 'package_label'] as const;
type IngredientSyncField = (typeof INGREDIENT_SYNC_FIELDS)[number];

function stopDialogFormPropagation(event: FormEvent<HTMLFormElement>) {
    event.stopPropagation();
}

function toIngredientFormValues(ingredient: Ingredient): FormValues {
    return {
        name: ingredient.name,
        unit: ingredient.unit,
        category: ingredient.category || '',
        package_size: ingredient.package_size?.toString() || '',
        package_label: ingredient.package_label || '',
    };
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
    const [supabase] = useState(() => createClient());
    const [isSaving, setIsSaving] = useState(false);
    const [recordDeleted, setRecordDeleted] = useState(false);
    const [conflictFields, setConflictFields] = useState<IngredientSyncField[]>([]);
    const [showRemoteReview, setShowRemoteReview] = useState(false);
    const [latestRemoteIngredient, setLatestRemoteIngredient] = useState<Ingredient>(ingredient);
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initializedIngredientIdRef = useRef<string | null>(null);
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: toIngredientFormValues(ingredient),
    });
    const { dirtyFields } = useFormState({ control: form.control });

    const fieldLabels = {
        name: t('common.name'),
        unit: t('common.unit'),
        category: t('common.category'),
        package_size: t('ingredients.packageSizeOptional'),
        package_label: t('ingredients.packageLabelOptional'),
    } satisfies Record<IngredientSyncField, string>;

    useEffect(() => {
        if (!open) {
            initializedIngredientIdRef.current = null;
            return;
        }

        if (initializedIngredientIdRef.current === ingredient.id) {
            return;
        }

        initializedIngredientIdRef.current = ingredient.id;
        form.reset(toIngredientFormValues(ingredient));
        setLatestRemoteIngredient(ingredient);
        setConflictFields([]);
        setRecordDeleted(false);
        setShowRemoteReview(false);
    }, [form, ingredient, open]);

    const syncLatestIngredient = useCallback(async () => {
        const remoteIngredient = await fetchIngredientById(supabase, ingredient.id);

        if (!remoteIngredient) {
            setRecordDeleted(true);
            setShowRemoteReview(false);
            return;
        }

        const remoteFormValues = toIngredientFormValues(remoteIngredient);
        const currentValues = {
            name: form.getValues('name'),
            unit: form.getValues('unit'),
            category: form.getValues('category'),
            package_size: form.getValues('package_size'),
            package_label: form.getValues('package_label'),
        };
        const remoteValues = {
            name: remoteFormValues.name,
            unit: remoteFormValues.unit,
            category: remoteFormValues.category,
            package_size: remoteFormValues.package_size,
            package_label: remoteFormValues.package_label,
        };
        const mergeResult = mergeUntouchedFields({
            fields: INGREDIENT_SYNC_FIELDS,
            currentValues,
            remoteValues,
            dirtyFields: {
                name: !!dirtyFields.name,
                unit: !!dirtyFields.unit,
                category: !!dirtyFields.category,
                package_size: !!dirtyFields.package_size,
                package_label: !!dirtyFields.package_label,
            },
        });

        mergeResult.applied_fields.forEach((field) => {
            form.setValue(field, remoteValues[field], {
                shouldDirty: false,
                shouldTouch: false,
            });
        });

        setLatestRemoteIngredient(remoteIngredient);
        setConflictFields(mergeResult.conflicting_fields);
        setRecordDeleted(false);

        if (mergeResult.conflicting_fields.length === 0 && showRemoteReview) {
            setShowRemoteReview(false);
        }
    }, [
        dirtyFields.category,
        dirtyFields.name,
        dirtyFields.package_label,
        dirtyFields.package_size,
        dirtyFields.unit,
        form,
        ingredient.id,
        showRemoteReview,
        supabase,
    ]);

    const scheduleIngredientSync = useCallback(() => {
        if (refetchTimerRef.current) {
            clearTimeout(refetchTimerRef.current);
        }

        refetchTimerRef.current = setTimeout(() => {
            void syncLatestIngredient();
        }, 250);
    }, [syncLatestIngredient]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const channel = subscribeToKitchenScope({
            supabase,
            scope: 'ingredient-record',
            recordId: ingredient.id,
            onChange: () => {
                scheduleIngredientSync();
            },
        });

        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [ingredient.id, open, scheduleIngredientSync, supabase]);

    async function onSubmit(data: FormValues) {
        if (recordDeleted) {
            toast.error(t('sync.recordDeleted'));
            return;
        }

        if (isSaving) return;
        setIsSaving(true);

        try {
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
        } finally {
            setIsSaving(false);
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
                        {recordDeleted ? (
                            <RealtimeSyncBanner
                                title={t('sync.deletedTitle')}
                                description={t('sync.ingredientDeletedDescription')}
                                reviewLabel={t('sync.reviewLatest')}
                                reloadLabel={t('sync.reloadFromLatest')}
                                deleted
                            />
                        ) : null}
                        {!recordDeleted && conflictFields.length > 0 ? (
                            <RealtimeSyncBanner
                                title={t('sync.conflictTitle')}
                                description={t('sync.ingredientConflictDescription')}
                                conflictFields={conflictFields.map((field) => fieldLabels[field])}
                                reviewLabel={t('sync.reviewLatest')}
                                reloadLabel={t('sync.reloadFromLatest')}
                                reviewOpen={showRemoteReview}
                                onReview={() => setShowRemoteReview((prev) => !prev)}
                                onReload={() => {
                                    form.reset(toIngredientFormValues(latestRemoteIngredient));
                                    setConflictFields([]);
                                    setRecordDeleted(false);
                                    setShowRemoteReview(false);
                                }}
                            >
                                {showRemoteReview ? (
                                    <div className="space-y-2 text-sm">
                                        <div className="grid grid-cols-2 gap-3">
                                            <span className="font-medium">{t('common.name')}</span>
                                            <span>{latestRemoteIngredient.name}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <span className="font-medium">{t('common.unit')}</span>
                                            <span>{latestRemoteIngredient.unit || t('common.none')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <span className="font-medium">{t('common.category')}</span>
                                            <span>{latestRemoteIngredient.category || t('common.none')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <span className="font-medium">{t('ingredients.packageSizeOptional')}</span>
                                            <span>{latestRemoteIngredient.package_size?.toString() || t('common.none')}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <span className="font-medium">{t('ingredients.packageLabelOptional')}</span>
                                            <span>{latestRemoteIngredient.package_label || t('common.none')}</span>
                                        </div>
                                    </div>
                                ) : null}
                            </RealtimeSyncBanner>
                        ) : null}
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
                            <Button type="submit" disabled={isSaving || recordDeleted}>
                                {isSaving ? t('common.saving') : t('ingredients.saveChanges')}
                            </Button>
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
