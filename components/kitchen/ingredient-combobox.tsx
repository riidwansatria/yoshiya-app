'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Ingredient } from '@/lib/queries/ingredients';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from '@/components/ui/combobox';
import { AddIngredientDialog } from './ingredient-dialogs';

interface IngredientComboboxProps {
    value: string;
    onValueChange: (value: string) => void;
    ingredients: Ingredient[];
    /** IDs of ingredients already used in other rows — these are dimmed */
    usedIds?: Set<string>;
}

export function IngredientCombobox({
    value,
    onValueChange,
    ingredients,
    usedIds = new Set(),
}: IngredientComboboxProps) {
    const [showCreate, setShowCreate] = useState(false);

    const selected = ingredients.find((i) => i.id === value) ?? null;

    // Build items list for the combobox
    const items = ingredients.map((i) => ({
        id: i.id,
        label: `${i.name}${i.unit ? ` (${i.unit})` : ''}`,
        name: i.name,
        unit: i.unit,
        isUsed: usedIds.has(i.id) && i.id !== value,
    }));

    return (
        <>
            <Combobox
                value={selected}
                onValueChange={(item) => {
                    if (item) onValueChange(item.id);
                }}
                items={ingredients}
                itemToStringLabel={(item) => `${item.name}${item.unit ? ` (${item.unit})` : ''}`}
            >
                <ComboboxInput
                    placeholder="Search ingredient..."
                    showClear={!!value}
                />
                <ComboboxContent>
                    <ComboboxEmpty>No ingredient found.</ComboboxEmpty>
                    <ComboboxList>
                        {(ingredient) => {
                            const isUsed = usedIds.has(ingredient.id) && ingredient.id !== value;
                            return (
                                <ComboboxItem
                                    key={ingredient.id}
                                    value={ingredient}
                                    className={cn(isUsed && 'opacity-40')}
                                >
                                    <span className="truncate">
                                        {ingredient.name}
                                        {ingredient.unit && (
                                            <span className="text-muted-foreground ml-1">
                                                ({ingredient.unit})
                                            </span>
                                        )}
                                    </span>
                                    {isUsed && (
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            used
                                        </span>
                                    )}
                                </ComboboxItem>
                            );
                        }}
                    </ComboboxList>
                    <div className="sticky bottom-0 bg-popover border-t p-1">
                        <button
                            type="button"
                            className="text-primary flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Create new ingredient...
                        </button>
                    </div>
                </ComboboxContent>
            </Combobox>

            <AddIngredientDialog open={showCreate} onOpenChange={setShowCreate} />
        </>
    );
}
