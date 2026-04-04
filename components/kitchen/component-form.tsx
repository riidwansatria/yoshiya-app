'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useFieldArray, useForm, useFormState } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, ArrowUp, ArrowDown } from 'lucide-react';

import { RecipeComponent } from '@/lib/queries/components';
import { Ingredient } from '@/lib/queries/ingredients';
import { createComponent, updateComponent, updateComponentIngredients } from '@/lib/actions/components';
import { IngredientCombobox } from '@/components/kitchen/ingredient-combobox';
import { parseFractionalQuantity, decimalToFraction } from '@/lib/utils/fraction-quantity';
import { createClient } from '@/lib/supabase/client';
import { fetchComponentById, fetchIngredients } from '@/lib/queries/kitchen';
import { subscribeToKitchenScope } from '@/lib/realtime/kitchen';
import {
    type ComponentIngredientDraft,
    mergeComponentIngredientRows,
    mergeUntouchedFields,
} from '@/lib/kitchen/realtime-merge';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FractionalQuantityInput } from './fractional-quantity-input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { RealtimeSyncBanner } from './realtime-sync-banner';

const ingredientSchema = z.object({
    ingredient_id: z.string().min(1, 'Please select an ingredient'),
    qty_per_serving: z.string().min(1, 'Quantity is required'),
});

const componentSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    yield_servings: z.number().min(1, 'Yield must be at least 1'),
    ingredients: z.array(ingredientSchema),
});

type FormValues = z.infer<typeof componentSchema>;
const COMPONENT_SYNC_FIELDS = ['name', 'description', 'yield_servings'] as const;
type ComponentSyncField = (typeof COMPONENT_SYNC_FIELDS)[number];
type ComponentConflictField = ComponentSyncField | 'ingredients';

function toComponentIngredientRows(component: RecipeComponent | null): ComponentIngredientDraft[] {
    return (component?.component_ingredients ?? []).map((componentIngredient) => ({
        ingredient_id: componentIngredient.ingredient_id,
        qty_per_serving: decimalToFraction(componentIngredient.qty_per_serving),
    }));
}

function toComponentFormValues(component: RecipeComponent | null): FormValues {
    return {
        name: component?.name || '',
        description: component?.description || '',
        yield_servings: component?.yield_servings || 1,
        ingredients: toComponentIngredientRows(component),
    };
}

export function ComponentForm({
    initialData,
    availableIngredients,
    restaurantId,
}: {
    initialData: RecipeComponent | null;
    availableIngredients: Ingredient[];
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();
    const [supabase] = useState(() => createClient());
    const [isSaving, setIsSaving] = useState(false);
    const [localIngredients, setLocalIngredients] = useState(availableIngredients);
    const [latestRemoteComponent, setLatestRemoteComponent] = useState<RecipeComponent | null>(initialData);
    const [recordDeleted, setRecordDeleted] = useState(false);
    const [conflictFields, setConflictFields] = useState<ComponentConflictField[]>([]);
    const [showRemoteReview, setShowRemoteReview] = useState(false);
    const componentSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ingredientSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const initializedComponentIdRef = useRef<string | null>(null);

    const form = useForm<FormValues>({
        resolver: zodResolver(componentSchema),
        defaultValues: toComponentFormValues(initialData),
    });
    const { dirtyFields } = useFormState({ control: form.control });
    const fieldLabels = {
        name: t('components.form.name'),
        description: t('common.description'),
        yield_servings: t('components.form.yield'),
        ingredients: t('components.form.ingredients'),
    } satisfies Record<ComponentConflictField, string>;

    useEffect(() => {
        const nextComponentId = initialData?.id ?? null;
        if (initializedComponentIdRef.current === nextComponentId) {
            return;
        }

        initializedComponentIdRef.current = nextComponentId;
        form.reset(toComponentFormValues(initialData));
        setLocalIngredients(availableIngredients);
        setLatestRemoteComponent(initialData);
        setRecordDeleted(false);
        setConflictFields([]);
        setShowRemoteReview(false);
    }, [availableIngredients, form, initialData]);

    const syncIngredientOptions = useCallback(async () => {
        const nextIngredients = await fetchIngredients(supabase);
        setLocalIngredients(nextIngredients);
    }, [supabase]);

    const syncLatestComponent = useCallback(async () => {
        if (!initialData) {
            return;
        }

        const remoteComponent = await fetchComponentById(supabase, initialData.id);

        if (!remoteComponent) {
            setLatestRemoteComponent(null);
            setRecordDeleted(true);
            setShowRemoteReview(false);
            return;
        }

        const remoteValues = toComponentFormValues(remoteComponent);
        const currentScalarValues = {
            name: form.getValues('name'),
            description: form.getValues('description'),
            yield_servings: form.getValues('yield_servings'),
        };
        const remoteScalarValues = {
            name: remoteValues.name,
            description: remoteValues.description,
            yield_servings: remoteValues.yield_servings,
        };
        const scalarMergeResult = mergeUntouchedFields({
            fields: COMPONENT_SYNC_FIELDS,
            currentValues: currentScalarValues,
            remoteValues: remoteScalarValues,
            dirtyFields: {
                name: !!dirtyFields.name,
                description: !!dirtyFields.description,
                yield_servings: !!dirtyFields.yield_servings,
            },
        });

        scalarMergeResult.applied_fields.forEach((field) => {
            form.setValue(field, remoteValues[field], {
                shouldDirty: false,
                shouldTouch: false,
            });
        });

        const ingredientMergeResult = mergeComponentIngredientRows({
            currentRows: form.getValues('ingredients'),
            syncedRows: toComponentIngredientRows(latestRemoteComponent),
            remoteRows: remoteValues.ingredients,
        });

        if (ingredientMergeResult.nextRows) {
            form.setValue('ingredients', ingredientMergeResult.nextRows, {
                shouldDirty: false,
                shouldTouch: false,
            });
        }

        const nextConflictFields = [
            ...scalarMergeResult.conflicting_fields,
            ...ingredientMergeResult.conflicting_fields,
        ] as ComponentConflictField[];

        setLatestRemoteComponent(remoteComponent);
        setRecordDeleted(false);
        setConflictFields(nextConflictFields);

        if (nextConflictFields.length === 0 && showRemoteReview) {
            setShowRemoteReview(false);
        }
    }, [
        dirtyFields.description,
        dirtyFields.name,
        dirtyFields.yield_servings,
        form,
        initialData,
        latestRemoteComponent,
        showRemoteReview,
        supabase,
    ]);

    const scheduleComponentSync = useCallback(() => {
        if (componentSyncTimerRef.current) {
            clearTimeout(componentSyncTimerRef.current);
        }

        componentSyncTimerRef.current = setTimeout(() => {
            void syncLatestComponent();
        }, 250);
    }, [syncLatestComponent]);

    const scheduleIngredientOptionSync = useCallback(() => {
        if (ingredientSyncTimerRef.current) {
            clearTimeout(ingredientSyncTimerRef.current);
        }

        ingredientSyncTimerRef.current = setTimeout(() => {
            void syncIngredientOptions();
        }, 250);
    }, [syncIngredientOptions]);

    useEffect(() => {
        if (!initialData) {
            return;
        }

        const channel = subscribeToKitchenScope({
            supabase,
            scope: 'component-record',
            recordId: initialData.id,
            onChange: (change) => {
                if (change.table === 'ingredients') {
                    scheduleIngredientOptionSync();
                    return;
                }

                scheduleComponentSync();
            },
        });

        return () => {
            if (componentSyncTimerRef.current) {
                clearTimeout(componentSyncTimerRef.current);
            }
            if (ingredientSyncTimerRef.current) {
                clearTimeout(ingredientSyncTimerRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [initialData, scheduleComponentSync, scheduleIngredientOptionSync, supabase]);

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: 'ingredients',
    });

    const handleMoveUp = useCallback((index: number) => move(index, index - 1), [move]);
    const handleMoveDown = useCallback((index: number) => move(index, index + 1), [move]);

    const appendGuard = useRef(false);
    const safeAppend = useCallback(() => {
        if (appendGuard.current) return;
        appendGuard.current = true;
        append({ ingredient_id: '', qty_per_serving: '1' });
        setTimeout(() => {
            appendGuard.current = false;
        }, 100);
    }, [append]);

    const handleQuantityCommit = useCallback(
        (index: number, _parsed: number | null, error: string | null) => {
            const path = `ingredients.${index}.qty_per_serving` as const;
            if (error) {
                form.setError(path, { type: 'manual', message: error });
                return;
            }
            form.clearErrors(path);
        },
        [form]
    );

    async function onSubmit(data: FormValues) {
        if (recordDeleted) {
            toast.error(t('sync.recordDeleted'));
            return;
        }

        setIsSaving(true);
        let componentId = initialData?.id;

        try {
            if (initialData) {
                const res = await updateComponent(initialData.id, {
                    name: data.name,
                    description: data.description,
                    yield_servings: data.yield_servings,
                });
                if (res.error) throw new Error(res.error);
            } else {
                const res = await createComponent({
                    restaurant_id: restaurantId,
                    name: data.name,
                    description: data.description,
                    yield_servings: data.yield_servings,
                });
                if (res.error || !res.data) throw new Error(res.error || 'Failed to create component');
                componentId = res.data.id;
            }

            const parsedIngredients = data.ingredients.map((ingredient, index) => {
                const parsed = parseFractionalQuantity(ingredient.qty_per_serving);
                if (!parsed.ok) {
                    form.setError(`ingredients.${index}.qty_per_serving`, {
                        type: 'manual',
                        message: parsed.error,
                    });
                    return null;
                }
                form.clearErrors(`ingredients.${index}.qty_per_serving`);
                return {
                    ingredient_id: ingredient.ingredient_id,
                    qty_per_serving: parsed.value,
                };
            });

            if (parsedIngredients.some((ingredient) => ingredient === null)) {
                toast.error(t('components.form.fixQuantityErrors'));
                return;
            }

            if (componentId) {
                const mappingRes = await updateComponentIngredients(
                    componentId,
                    parsedIngredients as { ingredient_id: string; qty_per_serving: number }[]
                );
                if (mappingRes.error) throw new Error(mappingRes.error);
            }

            toast.success(initialData ? t('components.form.updated') : t('components.form.created'));
            router.push(`/dashboard/${restaurantId}/components`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : t('components.form.saveFailed');
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {recordDeleted ? (
                    <RealtimeSyncBanner
                        title={t('sync.deletedTitle')}
                        description={t('sync.componentDeletedDescription')}
                        reviewLabel={t('sync.reviewLatest')}
                        reloadLabel={t('sync.reloadFromLatest')}
                        deleted
                    />
                ) : null}
                {!recordDeleted && conflictFields.length > 0 ? (
                    <RealtimeSyncBanner
                        title={t('sync.conflictTitle')}
                        description={t('sync.componentConflictDescription')}
                        conflictFields={conflictFields.map((field) => fieldLabels[field])}
                        reviewLabel={t('sync.reviewLatest')}
                        reloadLabel={t('sync.reloadFromLatest')}
                        reviewOpen={showRemoteReview}
                        onReview={() => setShowRemoteReview((prev) => !prev)}
                        onReload={() => {
                            form.reset(toComponentFormValues(latestRemoteComponent));
                            setConflictFields([]);
                            setRecordDeleted(false);
                            setShowRemoteReview(false);
                        }}
                    >
                        {showRemoteReview && latestRemoteComponent ? (
                            <div className="space-y-4 text-sm">
                                <div className="grid gap-2 md:grid-cols-2">
                                    <div>
                                        <p className="font-medium">{t('components.form.name')}</p>
                                        <p>{latestRemoteComponent.name}</p>
                                    </div>
                                    <div>
                                        <p className="font-medium">{t('components.form.yield')}</p>
                                        <p>{latestRemoteComponent.yield_servings}</p>
                                    </div>
                                </div>
                                <div>
                                    <p className="font-medium">{t('common.description')}</p>
                                    <p>{latestRemoteComponent.description || t('common.none')}</p>
                                </div>
                                <div>
                                    <p className="font-medium">{t('components.form.ingredients')}</p>
                                    {latestRemoteComponent.component_ingredients?.length ? (
                                        <ul className="mt-2 space-y-1">
                                            {latestRemoteComponent.component_ingredients.map((componentIngredient) => (
                                                <li key={componentIngredient.ingredient_id}>
                                                    {componentIngredient.ingredients?.name || t('components.unknownIngredient')}:
                                                    {' '}
                                                    {decimalToFraction(componentIngredient.qty_per_serving)}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p>{t('components.form.empty')}</p>
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </RealtimeSyncBanner>
                ) : null}
                <div className="space-y-4 rounded-md border p-6">
                    <h3 className="font-semibold text-lg">{t('components.form.details')}</h3>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('components.form.name')}</FormLabel>
                                <FormControl>
                                    <Input placeholder={t('components.placeholders.name')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('components.form.description')}</FormLabel>
                                <FormControl>
                                    <Textarea placeholder={t('components.placeholders.description')} {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="yield_servings"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>{t('components.form.yield')}</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        {...field}
                                        onChange={(e) =>
                                            field.onChange(e.target.value ? Number(e.target.value) : 0)
                                        }
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-md border p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="font-semibold text-lg">{t('components.form.ingredients')}</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                {t('components.form.quantityHint')}
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={safeAppend}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            {t('components.form.addRow')}
                        </Button>
                    </div>

                    {fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('components.form.empty')}</p>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const selectedIngredientId = form.watch(`ingredients.${index}.ingredient_id`);
                                const selectedIngredient = localIngredients.find((ingredient) => ingredient.id === selectedIngredientId);
                                const unitLabel = selectedIngredient?.unit || 'unit';

                                const usedIds = new Set(
                                    fields
                                        .map((_, i) => form.watch(`ingredients.${i}.ingredient_id`))
                                        .filter((id): id is string => !!id)
                                );

                                return (
                                    <div key={field.id} className="flex gap-3 items-start bg-background border rounded-md p-3">
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.ingredient_id`}
                                            render={({ field }) => (
                                                <FormItem className="flex-[2]">
                                                    <FormLabel className="text-xs">{t('components.form.ingredient')}</FormLabel>
                                                    <FormControl>
                                                        <IngredientCombobox
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            ingredients={localIngredients}
                                                            usedIds={usedIds}
                                                            onNewIngredient={(newIngredient) =>
                                                                setLocalIngredients((prev) => [...prev, newIngredient])
                                                            }
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.qty_per_serving`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <FormLabel className="text-xs">{t('components.form.qtyPerServing', { unit: unitLabel })}</FormLabel>
                                                    <FormControl>
                                                        <FractionalQuantityInput
                                                            value={field.value || ''}
                                                            onValueChange={field.onChange}
                                                            onCommit={(parsed, error) =>
                                                                handleQuantityCommit(index, parsed, error)
                                                            }
                                                            label={t('components.form.qtyPerServingLabel')}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="mt-6 flex items-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={index === 0}
                                                onClick={() => handleMoveUp(index)}
                                                className="h-8 w-8 text-muted-foreground"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                disabled={index === fields.length - 1}
                                                onClick={() => handleMoveDown(index)}
                                                className="h-8 w-8 text-muted-foreground"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 ml-1"
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/${restaurantId}/components`)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button type="submit" disabled={isSaving || recordDeleted}>
                        {isSaving ? t('common.saving') : t('components.form.save')}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
