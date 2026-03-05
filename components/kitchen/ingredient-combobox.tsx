'use client';

import { useState, useRef, useCallback } from 'react';
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
    /** Called when a new ingredient is created, so parent can add it to the list */
    onNewIngredient?: (ingredient: Ingredient) => void;
}

export function IngredientCombobox({
    value,
    onValueChange,
    ingredients,
    usedIds = new Set(),
    onNewIngredient,
}: IngredientComboboxProps) {
    const [showCreate, setShowCreate] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [pendingName, setPendingName] = useState('');
    const createBtnRef = useRef<HTMLButtonElement>(null);

    const selected = ingredients.find((i) => i.id === value) ?? null;

    // Filter matches the same way the base-ui combobox does (case-insensitive includes)
    const hasMatches = inputValue.trim() === '' ||
        ingredients.some((i) =>
            i.name.toLowerCase().includes(inputValue.trim().toLowerCase())
        );

    const openCreate = useCallback((name: string) => {
        setPendingName(name);
        setShowCreate(true);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !hasMatches && inputValue.trim()) {
            e.preventDefault();
            e.stopPropagation();
            openCreate(inputValue.trim());
        }
    }, [hasMatches, inputValue, openCreate]);

    return (
        <>
            <Combobox
                value={selected}
                onValueChange={(item) => {
                    if (item) onValueChange(item.id);
                }}
                items={ingredients}
                itemToStringLabel={(item) => item.name}
                autoHighlight
            >
                <ComboboxInput
                    placeholder="Search ingredient..."
                    showClear={!!value}
                    onInput={(e) => setInputValue((e.target as HTMLInputElement).value)}
                    onKeyDown={handleKeyDown}
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
                            ref={createBtnRef}
                            type="button"
                            className={cn(
                                'text-primary flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none hover:bg-accent',
                                !hasMatches && inputValue.trim() && 'bg-accent font-medium ring-1 ring-primary/30'
                            )}
                            onClick={() => openCreate(inputValue.trim())}
                        >
                            <Plus className="h-4 w-4" />
                            {!hasMatches && inputValue.trim()
                                ? `Create "${inputValue.trim()}"...`
                                : 'Create new ingredient...'}
                        </button>
                    </div>
                </ComboboxContent>
            </Combobox>

            <AddIngredientDialog
                open={showCreate}
                onOpenChange={setShowCreate}
                initialName={pendingName}
                onSuccess={(newIngredient) => {
                    onNewIngredient?.(newIngredient);
                    onValueChange(newIngredient.id);
                }}
            />
        </>
    );
}
