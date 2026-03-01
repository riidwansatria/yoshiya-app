'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Control, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Trash, Plus, PlusCircle, ArrowUp, ArrowDown } from 'lucide-react';

import { AddComponentDialogInline } from './add-component-dialog-inline';

import { Menu } from '@/lib/queries/menus';
import { ComponentOption } from '@/lib/queries/components';
import { createMenu, updateMenu } from '@/lib/actions/menus';
import { updateMenuComponents } from '@/lib/actions/menu-components';
import { parseFractionalQuantity } from '@/lib/utils/fraction-quantity';

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const menuComponentSchema = z.object({
    component_id: z.string().min(1, 'Please select a component'),
    qty_per_order: z.string().min(1, 'Quantity is required'),
});

const menuSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    season: z.string().optional(),
    price: z.number().nullable().optional(),
    description: z.string().optional(),
    color: z.string().optional(),
    components: z.array(menuComponentSchema),
});

type FormValues = z.infer<typeof menuSchema>;

type MenuComponentRowProps = {
    index: number;
    rowCount: number;
    control: Control<FormValues>;
    componentOptions: ComponentOption[];
    componentNameById: Map<string, string>;
    onMoveUp: (index: number) => void;
    onMoveDown: (index: number) => void;
    onRemove: (index: number) => void;
    onQuantityCommit: (index: number, parsed: number | null, error: string | null) => void;
};

const MenuComponentRow = memo(function MenuComponentRow({
    index,
    rowCount,
    control,
    componentOptions,
    componentNameById,
    onMoveUp,
    onMoveDown,
    onRemove,
    onQuantityCommit,
}: MenuComponentRowProps) {
    const [isSelectOpen, setIsSelectOpen] = useState(false);
    const [hasOpenedSelect, setHasOpenedSelect] = useState(false);

    const handleSelectOpenChange = useCallback((open: boolean) => {
        if (open) {
            setHasOpenedSelect(true);
        }
        setIsSelectOpen(open);
    }, []);

    return (
        <div className="flex gap-4 items-start bg-background border rounded-md p-3">
            <FormField
                control={control}
                name={`components.${index}.component_id`}
                render={({ field }) => {
                    const selectedName =
                        typeof field.value === 'string' ? componentNameById.get(field.value) : undefined;

                    return (
                        <FormItem className="flex-[2]">
                            <FormLabel className="text-xs">Component</FormLabel>
                            <Select
                                value={field.value}
                                onValueChange={field.onChange}
                                open={isSelectOpen}
                                onOpenChange={handleSelectOpenChange}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select component">
                                            {selectedName}
                                        </SelectValue>
                                    </SelectTrigger>
                                </FormControl>
                                {hasOpenedSelect ? (
                                    <SelectContent>
                                        {componentOptions.map((component) => (
                                            <SelectItem key={component.id} value={component.id}>
                                                {component.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                ) : null}
                            </Select>
                            <FormMessage />
                        </FormItem>
                    );
                }}
            />

            <FormField
                control={control}
                name={`components.${index}.qty_per_order`}
                render={({ field }) => (
                    <FormItem className="flex-[1]">
                        <FormLabel className="text-xs">Qty / Order</FormLabel>
                        <FormControl>
                            <FractionalQuantityInput
                                value={field.value || ''}
                                onValueChange={field.onChange}
                                onCommit={(parsed, error) => onQuantityCommit(index, parsed, error)}
                                label="Qty / Order"
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
                    onClick={() => onMoveUp(index)}
                    className="h-8 w-8 text-muted-foreground"
                >
                    <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={index === rowCount - 1}
                    onClick={() => onMoveDown(index)}
                    className="h-8 w-8 text-muted-foreground"
                >
                    <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(index)}
                    className="h-8 w-8 text-muted-foreground hover:text-red-600 ml-1"
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
});

export function MenuForm({
    initialData,
    availableComponents,
    restaurantId,
}: {
    initialData: Menu | null;
    availableComponents: ComponentOption[];
    restaurantId: string;
}) {
    const router = useRouter();
    const [isSaving, setIsSaving] = useState(false);
    const [isAddDialog, setIsAddDialog] = useState(false);
    const [localComponentsList, setLocalComponentsList] = useState(availableComponents);
    const sortedComponentOptions = useMemo(
        () => [...localComponentsList].sort((a, b) => a.name.localeCompare(b.name)),
        [localComponentsList]
    );
    const componentNameById = useMemo(
        () => new Map(sortedComponentOptions.map((component) => [component.id, component.name])),
        [sortedComponentOptions]
    );

    // Map initial components if editing
    const initialComponents = initialData?.menu_components?.map((mc) => ({
        component_id: mc.component_id,
        qty_per_order: mc.qty_per_order.toString(),
    })) || [];

    const form = useForm<FormValues>({
        resolver: zodResolver(menuSchema),
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
    const handleMoveUp = useCallback((index: number) => move(index, index - 1), [move]);
    const handleMoveDown = useCallback((index: number) => move(index, index + 1), [move]);
    const handleRemove = useCallback((index: number) => remove(index), [remove]);
    const handleQuantityCommit = useCallback(
        (index: number, _parsed: number | null, error: string | null) => {
            const path = `components.${index}.qty_per_order` as const;
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

            const parsedComponents = data.components.map((component, index) => {
                const parsed = parseFractionalQuantity(component.qty_per_order);
                if (!parsed.ok) {
                    form.setError(`components.${index}.qty_per_order`, {
                        type: 'manual',
                        message: parsed.error,
                    });
                    return null;
                }
                form.clearErrors(`components.${index}.qty_per_order`);
                return {
                    component_id: component.component_id,
                    qty_per_order: parsed.value,
                };
            });

            if (parsedComponents.some((component) => component === null)) {
                toast.error('Please fix quantity errors before saving.');
                return;
            }

            // Update mapping
            if (menuId) {
                const mappingRes = await updateMenuComponents(
                    menuId,
                    parsedComponents as { component_id: string; qty_per_order: number }[]
                );
                if (mappingRes.error) throw new Error(mappingRes.error);
            }

            toast.success(initialData ? 'Menu updated' : 'Menu created');
            router.push(`/dashboard/${restaurantId}/menus`);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to save menu';
            toast.error(message);
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
                                <p className="text-xs text-muted-foreground mt-1">
                                    Accepted: decimal (0.5), fraction (1/6), mixed (1 1/2).
                                </p>
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
                                    onClick={() => append({ component_id: '', qty_per_order: '1' })}
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
                                {fields.map((field, index) => (
                                    <MenuComponentRow
                                        key={field.id}
                                        index={index}
                                        rowCount={fields.length}
                                        control={form.control}
                                        componentOptions={sortedComponentOptions}
                                        componentNameById={componentNameById}
                                        onMoveUp={handleMoveUp}
                                        onMoveDown={handleMoveDown}
                                        onRemove={handleRemove}
                                        onQuantityCommit={handleQuantityCommit}
                                    />
                                ))}
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
                    setLocalComponentsList(prev => [...prev, { id: newComp.id, name: newComp.name }]);
                    append({ component_id: newComp.id, qty_per_order: '1' });
                }}
            />
        </Form>
    );
}
