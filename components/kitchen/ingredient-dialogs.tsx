'use client';

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
});

type FormValues = z.infer<typeof schema>;

export function AddIngredientDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: { name: '', unit: '', category: '' },
    });

    async function onSubmit(data: FormValues) {
        const result = await createIngredient(data);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Ingredient added successfully');
            form.reset();
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add Ingredient</DialogTitle>
                    <DialogDescription>Add a new ingredient to the master list.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Tomato" {...field} />
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
                                    <FormLabel>Unit (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. g, ml, pcs" {...field} />
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
                                    <FormLabel>Category (Optional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Vegetables" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Save Ingredient</Button>
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
    const form = useForm<FormValues>({
        resolver: zodResolver(schema),
        defaultValues: {
            name: ingredient.name,
            unit: ingredient.unit,
            category: ingredient.category || '',
        },
    });

    async function onSubmit(data: FormValues) {
        const result = await updateIngredient(ingredient.id, data);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Ingredient updated successfully');
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Ingredient</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
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
                                    <FormLabel>Unit (Optional)</FormLabel>
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
                                    <FormLabel>Category</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit">Save Changes</Button>
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
    async function onSubmit() {
        const result = await deleteIngredient(ingredient.id);
        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success('Ingredient deleted');
            onOpenChange(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Delete Ingredient</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete <strong>{ingredient.name}</strong>? This action cannot be
                        undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={onSubmit}>
                        Delete
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
