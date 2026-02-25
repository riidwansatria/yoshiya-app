'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

import { AddComponentDialogInline } from './add-component-dialog-inline';

import { Menu } from '@/lib/queries/menus';
import { RecipeComponent } from '@/lib/queries/components';
import { createMenu, updateMenu } from '@/lib/actions/menus';
import { updateMenuComponents } from '@/lib/actions/menu-components';

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

const menuComponentSchema = z.object({
    component_id: z.string().min(1, 'Please select a component'),
    qty_per_order: z.coerce.number().min(0.01, 'Quantity must be > 0'),
});

const menuSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    season: z.string().optional(),
    price: z.preprocess(
        (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
        z.number().nullable()
    ).optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    components: z.array(menuComponentSchema),
});

type FormValues = z.infer<typeof menuSchema>;

export function MenuForm({
    initialData,
    availableComponents,
    restaurantId,
}: {
    initialData: Menu | null;
    availableComponents: RecipeComponent[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isAddDialog, setIsAddDialog] = useState(false);
    const [localComponentsList, setLocalComponentsList] = useState(availableComponents);

    // Map initial components if editing
    const initialComponents = initialData?.menu_components?.map((mc) => ({
        component_id: mc.component_id,
        qty_per_order: mc.qty_per_order,
    })) || [];

    const form = useForm<FormValues>({
        resolver: zodResolver(menuSchema) as any,
        defaultValues: {
            name: initialData?.name || '',
            season: initialData?.season || '',
            price: initialData?.price || null,
            description: initialData?.description || '',
            color: initialData?.color || '', // optional color
            components: initialComponents,
        },
    });

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: 'components',
    });

    async function onSubmit(data: FormValues) {
        setIsSaving(true);
        let menuId = initialData?.id;

        try {
            if (initialData) {
                // Update existing menu
                const res = await updateMenu(initialData.id, {
                    name: data.name,
                    season: data.season,
                    price: data.price,
                    description: data.description,
                    color: data.color,
                });
                if (res.error) throw new Error(res.error);
            } else {
                // Create new menu
                const res = await createMenu({
                    restaurant_id: restaurantId,
                    name: data.name,
                    season: data.season,
                    price: data.price,
                    description: data.description,
                    color: data.color,
                });
                if (res.error || !res.data) throw new Error(res.error || 'Failed to create menu');
                menuId = res.data.id;
            }

            // Update mapping
            if (menuId) {
                const mappingRes = await updateMenuComponents(menuId, data.components);
                if (mappingRes.error) throw new Error(mappingRes.error);
            }

            toast.success(initialData ? 'Menu updated' : 'Menu created');
            router.push(`/dashboard/${restaurantId}/menus`);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 flex-1 min-h-0">
                    {/* Menu Details Column */}
                    <div className="space-y-4 rounded-md border p-6 h-fit overflow-y-auto">
                        <h3 className="font-semibold text-lg">Menu Details</h3>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Spring Kaiseki" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="season"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Season</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Spring 2026" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price (¥)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Label Color</FormLabel>
                                    <FormControl>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="color"
                                                className="w-12 h-10 p-1"
                                                value={field.value || '#000000'}
                                                onChange={field.onChange}
                                            />
                                            <Input
                                                type="text"
                                                placeholder="#ffffff"
                                                {...field}
                                                value={field.value || ''}
                                                className="font-mono"
                                            />
                                        </div>
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
                                        <Textarea
                                            placeholder="Optional details, e.g., 9-course meal featuring local bamboo shoots..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Components Mapping Column */}
                    <div className="col-span-2 flex flex-col space-y-4 rounded-md border p-6 min-h-0">
                        <div className="flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-semibold text-lg">Mapped Components</h3>
                                <p className="text-sm text-muted-foreground">Build this menu by adding recipe components.</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsAddDialog(true)}
                                >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    New Component
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ component_id: '', qty_per_order: 1 })}
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add Row
                                </Button>
                            </div>
                        </div>

                        {fields.length === 0 ? (
                            <div className="rounded-md border border-dashed p-8 text-center bg-muted/50 shrink-0">
                                <p className="text-sm text-muted-foreground">No components added yet.</p>
                                <p className="text-xs text-muted-foreground mt-1">Components dictate the ingredients required for this menu.</p>
                            </div>
                        ) : (
                            <div className="flex-1 space-y-4 pr-2 overflow-y-auto min-h-0">
                                {fields.map((field, index) => {
                                    return (
                                        <div key={field.id} className="flex gap-4 items-start bg-background border rounded-md p-3">
                                            <FormField
                                                control={form.control}
                                                name={`components.${index}.component_id`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-[2]">
                                                        <FormLabel className="text-xs">Component</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select component" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                {localComponentsList.map((c) => (
                                                                    <SelectItem key={c.id} value={c.id}>
                                                                        {c.name}
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
                                                name={`components.${index}.qty_per_order`}
                                                render={({ field }) => (
                                                    <FormItem className="flex-[1]">
                                                        <FormLabel className="text-xs">Qty / Order</FormLabel>
                                                        <FormControl>
                                                            <Input type="number" step="0.01" {...field} />
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
                                                    onClick={() => move(index, index - 1)}
                                                    className="h-8 w-8 text-muted-foreground"
                                                >
                                                    <ArrowUp className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={index === fields.length - 1}
                                                    onClick={() => move(index, index + 1)}
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
                </div>

                <div className="flex justify-end gap-4 shrink-0 pt-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/dashboard/${restaurantId}/menus`)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Menu'}
                    </Button>
                </div>
            </form>

            <AddComponentDialogInline
                open={isAddDialog}
                onOpenChange={setIsAddDialog}
                restaurantId={restaurantId}
                onSuccess={(newComp) => {
                    setLocalComponentsList(prev => [...prev, newComp].sort((a, b) => a.name.localeCompare(b.name)));
                    append({ component_id: newComp.id, qty_per_order: 1 });
                }}
            />
        </Form>
    );
}
