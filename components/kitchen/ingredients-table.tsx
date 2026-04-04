'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition, Fragment } from 'react';

import { Ingredient } from '@/lib/queries/ingredients';
import { RecipeComponent } from '@/lib/queries/components';
import { useTranslations } from 'next-intl';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Search, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { duplicateIngredient } from '@/lib/actions/ingredients';
import {
    AddIngredientDialog,
    EditIngredientDialog,
    DeleteIngredientDialog,
} from './ingredient-dialogs';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { fetchIngredientsListData } from '@/lib/queries/kitchen';
import { subscribeToKitchenScope } from '@/lib/realtime/kitchen';
import { decimalToFraction } from '@/lib/utils/fraction-quantity';

function formatPackageDisplay(
    ingredient: Ingredient,
    t: ReturnType<typeof useTranslations<'kitchen'>>
) {
    if (!ingredient.package_size) {
        return t('common.none');
    }

    const packageLabel = ingredient.package_label?.trim() || t('ingredients.defaultPackageLabel');
    return t('ingredients.packageDisplay', {
        label: packageLabel,
        size: ingredient.package_size,
        unit: ingredient.unit,
    });
}

export function IngredientsTable({
    initialData,
    components,
    restaurantId,
}: {
    initialData: Ingredient[];
    components: RecipeComponent[];
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const [supabase] = useState(() => createClient());
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [deletingIngredient, setDeletingIngredient] = useState<Ingredient | null>(null);
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [ingredients, setIngredients] = useState(initialData);
    const [componentsState, setComponentsState] = useState(components);
    const [, startTransition] = useTransition();
    const refetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setIngredients(initialData);
    }, [initialData]);

    useEffect(() => {
        setComponentsState(components);
    }, [components]);

    useEffect(() => {
        if (!editingIngredient) {
            return;
        }

        const nextEditingIngredient = ingredients.find((ingredient) => ingredient.id === editingIngredient.id) ?? null;
        if (nextEditingIngredient && nextEditingIngredient !== editingIngredient) {
            setEditingIngredient(nextEditingIngredient);
        }
    }, [editingIngredient, ingredients]);

    useEffect(() => {
        if (!deletingIngredient) {
            return;
        }

        const nextDeletingIngredient = ingredients.find((ingredient) => ingredient.id === deletingIngredient.id) ?? null;
        if (nextDeletingIngredient && nextDeletingIngredient !== deletingIngredient) {
            setDeletingIngredient(nextDeletingIngredient);
        }
    }, [deletingIngredient, ingredients]);

    const refetchListData = useCallback(async () => {
        const nextData = await fetchIngredientsListData(supabase, restaurantId);
        startTransition(() => {
            setIngredients(nextData.ingredients);
            setComponentsState(nextData.components);
        });
    }, [restaurantId, supabase]);

    const scheduleRefetch = useCallback(() => {
        if (refetchTimerRef.current) {
            clearTimeout(refetchTimerRef.current);
        }

        refetchTimerRef.current = setTimeout(() => {
            void refetchListData();
        }, 250);
    }, [refetchListData]);

    useEffect(() => {
        const channel = subscribeToKitchenScope({
            supabase,
            scope: 'ingredients-list',
            restaurantId,
            onChange: () => {
                scheduleRefetch();
            },
        });

        return () => {
            if (refetchTimerRef.current) {
                clearTimeout(refetchTimerRef.current);
            }
            void supabase.removeChannel(channel);
        };
    }, [restaurantId, scheduleRefetch, supabase]);

    const componentUsageByIngredientId = useMemo(() => {
        const usage = new Map<string, { componentId: string; componentName: string; qtyPerServing: number; unit: string }[]>();

        for (const component of componentsState) {
            for (const componentIngredient of component.component_ingredients ?? []) {
                const current = usage.get(componentIngredient.ingredient_id) ?? [];
                current.push({
                    componentId: component.id,
                    componentName: component.name,
                    qtyPerServing: componentIngredient.qty_per_serving,
                    unit: componentIngredient.ingredients?.unit ?? '',
                });
                usage.set(componentIngredient.ingredient_id, current);
            }
        }

        return usage;
    }, [componentsState]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return ingredients;
        return ingredients.filter((i) =>
            i.name.toLowerCase().includes(q) ||
            i.unit.toLowerCase().includes(q) ||
            (i.category ?? '').toLowerCase().includes(q) ||
            (i.package_label ?? '').toLowerCase().includes(q) ||
            (i.package_size?.toString() ?? '').includes(q) ||
            (componentUsageByIngredientId.get(i.id) ?? []).some((usage) =>
                usage.componentName.toLowerCase().includes(q)
            )
        );
    }, [componentUsageByIngredientId, ingredients, search]);

    const allFilteredExpanded = useMemo(
        () => filtered.length > 0 && filtered.every((ingredient) => expandedRows.has(ingredient.id)),
        [expandedRows, filtered]
    );

    const toggleRow = useCallback((ingredientId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(ingredientId)) {
                next.delete(ingredientId);
            } else {
                next.add(ingredientId);
            }
            return next;
        });
    }, []);

    const toggleAllRows = useCallback(() => {
        setExpandedRows((prev) => {
            const next = new Set(prev);

            if (filtered.length === 0) {
                return next;
            }

            if (allFilteredExpanded) {
                filtered.forEach((ingredient) => {
                    next.delete(ingredient.id);
                });
                return next;
            }

            filtered.forEach((ingredient) => {
                next.add(ingredient.id);
            });
            return next;
        });
    }, [allFilteredExpanded, filtered]);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="flex items-center gap-2 shrink-0">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={t('ingredients.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('ingredients.addButton')}
                </Button>
            </div>

            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]">
                                <div className="flex items-center">
                                    <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-4 w-4 cursor-pointer p-0 text-muted-foreground hover:bg-transparent"
                                    onClick={toggleAllRows}
                                    disabled={filtered.length === 0}
                                    title={allFilteredExpanded ? t('common.collapseAll') : t('common.expandAll')}
                                        aria-label={allFilteredExpanded ? t('common.collapseAll') : t('common.expandAll')}
                                    >
                                        {allFilteredExpanded ? (
                                            <ChevronsUp className="h-4 w-4" />
                                        ) : (
                                            <ChevronsDown className="h-4 w-4" />
                                        )}
                                        <span className="sr-only">
                                            {allFilteredExpanded ? t('common.collapseAll') : t('common.expandAll')}
                                        </span>
                                    </Button>
                                </div>
                            </TableHead>
                            <TableHead>{t('common.name')}</TableHead>
                            <TableHead>{t('common.unit')}</TableHead>
                            <TableHead>{t('common.package')}</TableHead>
                            <TableHead>{t('common.category')}</TableHead>
                            <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {search
                                        ? t('ingredients.noResultsMatching', { query: search })
                                        : t('ingredients.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((ingredient) => {
                                const isExpanded = expandedRows.has(ingredient.id);
                                const componentUsage = componentUsageByIngredientId.get(ingredient.id) ?? [];

                                return (
                                    <Fragment key={ingredient.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(ingredient.id)}
                                        >
                                            <TableCell>
                                                <div className="flex items-center">
                                                    <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
                                                        {isExpanded ? (
                                                            <ChevronDown className="h-4 w-4" />
                                                        ) : (
                                                            <ChevronRight className="h-4 w-4" />
                                                        )}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <button
                                                    type="button"
                                                    className="cursor-pointer hover:underline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingIngredient(ingredient);
                                                    }}
                                                >
                                                    {ingredient.name}
                                                </button>
                                            </TableCell>
                                            <TableCell>{ingredient.unit}</TableCell>
                                            <TableCell>{formatPackageDisplay(ingredient, t)}</TableCell>
                                            <TableCell>{ingredient.category || t('common.none')}</TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">{t('common.openMenu')}</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => setEditingIngredient(ingredient)}>
                                                            {t('common.edit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={duplicatingId === ingredient.id}
                                                            onClick={async () => {
                                                                setDuplicatingId(ingredient.id);
                                                                await duplicateIngredient(ingredient.id);
                                                                setDuplicatingId(null);
                                                            }}
                                                        >
                                                            {duplicatingId === ingredient.id ? t('common.duplicating') : t('common.duplicate')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => setDeletingIngredient(ingredient)}
                                                        >
                                                            {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={6} className="border-b p-0">
                                                    <div className="space-y-4 p-4 pl-14">
                                                        <div>
                                                            <h4 className="text-sm font-medium">{t('ingredients.usedInComponents')}</h4>
                                                            {componentUsage.length === 0 ? (
                                                                <p className="mt-2 text-sm text-muted-foreground italic">
                                                                    {t('ingredients.notUsedInComponents')}
                                                                </p>
                                                            ) : (
                                                                <ul className="mt-2 space-y-2">
                                                                    {componentUsage.map((usage) => (
                                                                        <li key={`${ingredient.id}-${usage.componentId}`} className="text-sm flex items-center gap-3">
                                                                            <span className="inline-block min-w-[5em] text-right font-medium text-foreground tabular-nums">
                                                                                {decimalToFraction(usage.qtyPerServing)} {usage.unit}
                                                                            </span>
                                                                            <Link
                                                                                href={`/dashboard/${restaurantId}/components/${usage.componentId}`}
                                                                                className="text-foreground hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {usage.componentName}
                                                                            </Link>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            )}
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                );
                            })
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
