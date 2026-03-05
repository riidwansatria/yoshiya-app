'use client';

import { Ingredient } from '@/lib/queries/ingredients';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { duplicateIngredient } from '@/lib/actions/ingredients';
import {
    AddIngredientDialog,
    EditIngredientDialog,
    DeleteIngredientDialog,
} from './ingredient-dialogs';
import { useState, useMemo } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function IngredientsTable({ initialData }: { initialData: Ingredient[] }) {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return initialData;
        return initialData.filter((i) =>
            i.name.toLowerCase().includes(q) ||
            i.unit.toLowerCase().includes(q) ||
            (i.category ?? '').toLowerCase().includes(q)
        );
    }, [initialData, search]);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search ingredients..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Ingredient
                </Button>
            </div>

            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    {search ? `No ingredients matching "${search}".` : 'No ingredients found.'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((ingredient) => (
                                <TableRow key={ingredient.id}>
                                    <TableCell className="font-medium">{ingredient.name}</TableCell>
                                    <TableCell>{ingredient.unit}</TableCell>
                                    <TableCell>{ingredient.category || '-'}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingIngredient(ingredient)}>
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    disabled={duplicatingId === ingredient.id}
                                                    onClick={async () => {
                                                        setDuplicatingId(ingredient.id);
                                                        await duplicateIngredient(ingredient.id);
                                                        setDuplicatingId(null);
                                                    }}
                                                >
                                                    {duplicatingId === ingredient.id ? 'Duplicating...' : 'Duplicate'}
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600"
                                                    onClick={() => setDeletingIngredient(ingredient)}
                                                >
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddIngredientDialog open={isAddOpen} onOpenChange={setIsAddOpen} />
            {editingIngredient && (
                <EditIngredientDialog
                    ingredient={editingIngredient}
                    open={!!editingIngredient}
                    onOpenChange={(open: boolean) => !open && setEditingIngredient(null)}
                />
            )}
            {deletingIngredient && (
                <DeleteIngredientDialog
                    ingredient={deletingIngredient}
                    open={!!deletingIngredient}
                    onOpenChange={(open: boolean) => !open && setDeletingIngredient(null)}
                />
            )}
        </div>
    );
}
