'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, ArrowUp, ArrowDown } from 'lucide-react';

import { RecipeComponent } from '@/lib/queries/components';
import { Ingredient } from '@/lib/queries/ingredients';
import { createComponent, updateComponent, updateComponentIngredients } from '@/lib/actions/components';
import { IngredientCombobox } from '@/components/kitchen/ingredient-combobox';
import { parseFractionalQuantity, decimalToFraction } from '@/lib/utils/fraction-quantity';

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

export function ComponentForm({
    initialData,
    availableIngredients,
    restaurantId,
}: {
    initialData: RecipeComponent | null;
    availableIngredients: Ingredient[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [localIngredients, setLocalIngredients] = useState(availableIngredients);

    // Map initial ingredients if editing
    const initialIngredients = initialData?.component_ingredients?.map((ci) => ({
        ingredient_id: ci.ingredient_id,
        qty_per_serving: decimalToFraction(ci.qty_per_serving),
    })) || [];

    const form = useForm<FormValues>({
        resolver: zodResolver(componentSchema),
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            yield_servings: initialData?.yield_servings || 1,
            ingredients: initialIngredients,
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: 'ingredients',
    });

    const handleMoveUp = useCallback((index: number) => move(index, index - 1), [move]);
    const handleMoveDown = useCallback((index: number) => move(index, index + 1), [move]);

    // Guard against React Strict Mode double-firing append
    const appendGuard = useRef(false);
    const safeAppend = useCallback(() => {
        if (appendGuard.current) return;
        appendGuard.current = true;
        append({ ingredient_id: '', qty_per_serving: '1' });
        setTimeout(() => { appendGuard.current = false; }, 100);
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
        setIsSaving(true);
        let componentId = initialData?.id;

        try {
            if (initialData) {
                // Update existing component
                const res = await updateComponent(initialData.id, {
                    name: data.name,
                    description: data.description,
                    yield_servings: data.yield_servings,
                });
                if (res.error) throw new Error(res.error);
            } else {
                // Create new component
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
                toast.error('Please fix quantity errors before saving.');
                return;
            }

            // Update mapping
            if (componentId) {
                const mappingRes = await updateComponentIngredients(
                    componentId,
                    parsedIngredients as { ingredient_id: string; qty_per_serving: number }[]
                );
                if (mappingRes.error) throw new Error(mappingRes.error);
            }

            toast.success(initialData ? 'Component updated' : 'Component created');
            router.push(`/dashboard/${restaurantId}/components`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save component';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="space-y-4 rounded-md border p-6">
                    <h3 className="font-semibold text-lg">Component Details</h3>

                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Name</FormLabel>
                                <FormControl>
                                    <Input placeholder="e.g. Sushi Rice Base" {...field} />
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
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="Optional details..." {...field} />
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
                                <FormLabel>Yield (Servings produced)</FormLabel>
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
                            <h3 className="font-semibold text-lg">Ingredients</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                Qty accepts: decimal (0.5), fraction (1/6), mixed (1 1/2).
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={safeAppend}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Row
                        </Button>
                    </div>

                    {fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No ingredients added yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const selectedIngredientId = form.watch(`ingredients.${index}.ingredient_id`);
                                const selectedIngredient = availableIngredients.find(i => i.id === selectedIngredientId);
                                const unitLabel = selectedIngredient?.unit || 'unit';

                                // Collect IDs used in other rows
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
                                                    <FormLabel className="text-xs">Ingredient</FormLabel>
                                                    <FormControl>
                                                        <IngredientCombobox
                                                            value={field.value}
                                                            onValueChange={field.onChange}
                                                            ingredients={localIngredients}
                                                            usedIds={usedIds}
                                                            onNewIngredient={(newIng) =>
                                                                setLocalIngredients(prev => [...prev, newIng])
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
                                                    <FormLabel className="text-xs">Qty / Serving ({unitLabel})</FormLabel>
                                                    <FormControl>
                                                        <FractionalQuantityInput
                                                            value={field.value || ''}
                                                            onValueChange={field.onChange}
                                                            onCommit={(parsed, error) =>
                                                                handleQuantityCommit(index, parsed, error)
                                                            }
                                                            label={`Qty per serving`}
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
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Component'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
