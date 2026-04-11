'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

import type { Ingredient } from '@/lib/queries/ingredients';
import { updateIngredient } from '@/lib/actions/ingredients';
import { createClient } from '@/lib/supabase/client';
import { fetchIngredientById } from '@/lib/queries/kitchen';
import { subscribeToKitchenScope } from '@/lib/realtime/kitchen';
import { mergeUntouchedFields } from '@/lib/kitchen/realtime-merge';

import { RealtimeSyncBanner } from './realtime-sync-banner';
import { CategoryCombobox } from './category-combobox';
import { StoreCombobox } from './store-combobox';
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

const schema = z.object({
    name: z.string().min(1, 'Name is required'),
    unit: z.string(),
    category: z.string().optional(),
    store: z.string().optional(),
    package_size: z.string().optional().refine((value) => {
        const trimmed = (value ?? '').trim();

        return trimmed === '' || (!Number.isNaN(Number(trimmed)) && Number(trimmed) > 0);
    }, 'Package size must be greater than 0'),
    package_label: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;
const INGREDIENT_SYNC_FIELDS = ['name', 'unit', 'category', 'store', 'package_size', 'package_label'] as const;
type IngredientSyncField = (typeof INGREDIENT_SYNC_FIELDS)[number];

function toIngredientFormValues(ingredient: Ingredient): FormValues {
    return {
        name: ingredient.name,
        unit: ingredient.unit,
        category: ingredient.category || '',
        store: ingredient.store || '',
        package_size: ingredient.package_size?.toString() || '',
        package_label: ingredient.package_label || '',
    };
}

export function IngredientEditor({
    ingredient,
    stores,
    categories,
    presentation,
    onCancel,
    onSaved,
}: {
    ingredient: Ingredient;
    stores: string[];
    categories: string[];
    presentation: 'page' | 'modal';
    onCancel: () => void;
    onSaved: () => void;
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
        store: t('ingredients.storeOptional'),
        package_size: t('ingredients.packageSizeOptional'),
        package_label: t('ingredients.packageLabelOptional'),
    } satisfies Record<IngredientSyncField, string>;

    useEffect(() => {
        if (initializedIngredientIdRef.current === ingredient.id) {
            return;
        }

        initializedIngredientIdRef.current = ingredient.id;
        form.reset(toIngredientFormValues(ingredient));
        setLatestRemoteIngredient(ingredient);
        setConflictFields([]);
        setRecordDeleted(false);
        setShowRemoteReview(false);
    }, [form, ingredient]);

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
            store: form.getValues('store'),
            package_size: form.getValues('package_size'),
            package_label: form.getValues('package_label'),
        };
        const remoteValues = {
            name: remoteFormValues.name,
            unit: remoteFormValues.unit,
            category: remoteFormValues.category,
            store: remoteFormValues.store,
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
                store: !!dirtyFields.store,
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
        dirtyFields.store,
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
    }, [ingredient.id, scheduleIngredientSync, supabase]);

    async function onSubmit(data: FormValues) {
        if (recordDeleted) {
            toast.error(t('sync.recordDeleted'));
            return;
        }

        if (isSaving) {
            return;
        }

        setIsSaving(true);

        try {
            const trimmedPackageSize = data.package_size?.trim() ?? '';
            const result = await updateIngredient(ingredient.id, {
                name: data.name,
                unit: data.unit,
                category: data.category,
                store: data.store,
                package_size: trimmedPackageSize ? Number(trimmedPackageSize) : null,
                package_label: data.package_label,
            });

            if (result.error) {
                toast.error(result.error);
                return;
            }

            toast.success(t('ingredients.updated'));
            onSaved();
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                                    <span className="font-medium">{t('ingredients.storeOptional')}</span>
                                    <span>{latestRemoteIngredient.store || t('common.none')}</span>
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
                                <CategoryCombobox
                                    value={field.value || ''}
                                    onValueChange={(val) => field.onChange(val)}
                                    categories={categories}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="store"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{t('ingredients.storeOptional')}</FormLabel>
                            <FormControl>
                                <StoreCombobox
                                    value={field.value || ''}
                                    onValueChange={(val) => field.onChange(val)}
                                    stores={stores}
                                />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                                {t('ingredients.storeHint')}
                            </p>
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
                                    <Input {...field} />
                                </FormControl>
                                <p className="text-xs text-muted-foreground">
                                    {t('ingredients.packageLabelHint')}
                                </p>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className={`flex gap-2 ${presentation === 'page' ? 'justify-end pt-2' : 'justify-end'}`}>
                    <Button type="button" variant="outline" onClick={onCancel}>
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isSaving || recordDeleted}>
                        {isSaving ? t('common.saving') : t('ingredients.saveChanges')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
