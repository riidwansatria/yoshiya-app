'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus } from 'lucide-react';

import { RecipeComponent } from '@/lib/queries/components';
import { Ingredient } from '@/lib/queries/ingredients';
import { createComponent, updateComponent, updateComponentIngredients } from '@/lib/actions/components';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const ingredientSchema = z.object({
    ingredient_id: z.string().min(1, 'Please select an ingredient'),
    qty_per_serving: z.coerce.number().min(0.01, 'Quantity must be > 0'),
});

const componentSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    yield_servings: z.coerce.number().min(1, 'Yield must be at least 1'),
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

    // Map initial ingredients if editing
    const initialIngredients = initialData?.component_ingredients?.map((ci) => ({
        ingredient_id: ci.ingredient_id,
        qty_per_serving: ci.qty_per_serving,
    })) || [];

    const form = useForm<FormValues>({
        resolver: zodResolver(componentSchema) as any,
        defaultValues: {
            name: initialData?.name || '',
            description: initialData?.description || '',
            yield_servings: initialData?.yield_servings || 1,
            ingredients: initialIngredients,
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'ingredients',
    });

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

            // Update mapping
            if (componentId) {
                const mappingRes = await updateComponentIngredients(componentId, data.ingredients);
                if (mappingRes.error) throw new Error(mappingRes.error);
            }

            toast.success(initialData ? 'Component updated' : 'Component created');
            router.push(`/dashboard/${restaurantId}/components`);
        } catch (error: any) {
            toast.error(error.message);
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
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4 rounded-md border p-6">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-lg">Ingredients</h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => append({ ingredient_id: '', qty_per_serving: 0 })}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Ingredient
                        </Button>
                    </div>

                    {fields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No ingredients added yet.</p>
                    ) : (
                        <div className="space-y-4">
                            {fields.map((field, index) => {
                                const selectedIngredientId = form.watch(`ingredients.${index}.ingredient_id`);
                                const selectedIngredient = availableIngredients.find(i => i.id === selectedIngredientId);
                                const unitLabel = selectedIngredient ? selectedIngredient.unit : 'unit';

                                return (
                                    <div key={field.id} className="flex gap-4 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.ingredient_id`}
                                            render={({ field }) => (
                                                <FormItem className="flex-[2]">
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select ingredient" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {availableIngredients.map((i) => (
                                                                <SelectItem key={i.id} value={i.id}>
                                                                    {i.name} ({i.unit})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name={`ingredients.${index}.qty_per_serving`}
                                            render={({ field }) => (
                                                <FormItem className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <FormControl>
                                                            <Input type="number" step="0.01" {...field} />
                                                        </FormControl>
                                                        <span className="text-sm text-muted-foreground min-w-[30px]">
                                                            {unitLabel}
                                                        </span>
                                                    </div>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => remove(index)}
                                            className="mt-0.5 text-muted-foreground hover:text-red-600"
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
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
