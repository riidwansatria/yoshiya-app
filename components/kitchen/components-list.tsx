'use client';

import { RecipeComponent } from '@/lib/queries/components';
import { Menu } from '@/lib/queries/menus';
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
import { useCallback, useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { decimalToFraction } from '@/lib/utils/fraction-quantity';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteComponentDialog } from './component-dialogs';
import { duplicateComponent } from '@/lib/actions/components';

export function ComponentsList({
    initialData,
    menus,
    restaurantId,
}: {
    initialData: RecipeComponent[];
    menus: Menu[];
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();
    const [deletingComponent, setDeletingComponent] = useState<RecipeComponent | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const menuUsageByComponentId = useMemo(() => {
        const usage = new Map<string, { menuId: string; menuName: string; qtyPerOrder: number }[]>();

        for (const menu of menus) {
            for (const menuComponent of menu.menu_components ?? []) {
                const current = usage.get(menuComponent.component_id) ?? [];
                current.push({
                    menuId: menu.id,
                    menuName: menu.name,
                    qtyPerOrder: menuComponent.qty_per_order,
                });
                usage.set(menuComponent.component_id, current);
            }
        }

        return usage;
    }, [menus]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return initialData;
        return initialData.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            (c.description ?? '').toLowerCase().includes(q) ||
            (c.component_ingredients ?? []).some((componentIngredient) =>
                (componentIngredient.ingredients?.name ?? '').toLowerCase().includes(q) ||
                (componentIngredient.ingredients?.unit ?? '').toLowerCase().includes(q)
            ) ||
            (menuUsageByComponentId.get(c.id) ?? []).some((usage) =>
                usage.menuName.toLowerCase().includes(q)
            )
        );
    }, [initialData, menuUsageByComponentId, search]);

    const toggleRow = useCallback((componentId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(componentId)) {
                next.delete(componentId);
            } else {
                next.add(componentId);
            }
            return next;
        });
    }, []);

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t('components.searchPlaceholder')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9"
                />
            </div>
            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>{t('common.name')}</TableHead>
                            <TableHead>{t('common.description')}</TableHead>
                            <TableHead>{t('components.yieldServings')}</TableHead>
                            <TableHead>{t('components.ingredientsCount')}</TableHead>
                            <TableHead className="w-[100px]">{t('common.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    {search
                                        ? t('components.noResultsMatching', { query: search })
                                        : t('components.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((component) => {
                                const isExpanded = expandedRows.has(component.id);
                                const menuUsage = menuUsageByComponentId.get(component.id) ?? [];
                                return (
                                    <Fragment key={component.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(component.id)}
                                        >
                                            <TableCell>
                                                {isExpanded ? (
                                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                ) : (
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                )}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                <Link
                                                    href={`/dashboard/${restaurantId}/components/${component.id}`}
                                                    className="hover:underline"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {component.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell className="max-w-[300px] truncate text-muted-foreground">
                                                {component.description || t('common.none')}
                                            </TableCell>
                                            <TableCell>{component.yield_servings}</TableCell>
                                            <TableCell>{component.component_ingredients?.length || 0}</TableCell>
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">{t('common.openMenu')}</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() =>
                                                                router.push(`/dashboard/${restaurantId}/components/${component.id}`)
                                                            }
                                                        >
                                                            {t('common.viewEdit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={duplicatingId === component.id}
                                                            onClick={async () => {
                                                                setDuplicatingId(component.id);
                                                                const result = await duplicateComponent(component.id);
                                                                setDuplicatingId(null);
                                                                if (result?.data?.id) {
                                                                    router.push(`/dashboard/${restaurantId}/components/${result.data.id}`);
                                                                }
                                                            }}
                                                        >
                                                            {duplicatingId === component.id ? t('common.duplicating') : t('common.duplicate')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => setDeletingComponent(component)}
                                                        >
                                                            {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={6} className="p-0 border-b">
                                                    <div className="p-4 pl-14">
                                                        {(!component.component_ingredients || component.component_ingredients.length === 0) ? (
                                                            <p className="text-sm text-muted-foreground italic">{t('components.noIngredientsMapped')}</p>
                                                        ) : (
                                                            <ul className="space-y-2">
                                                                {component.component_ingredients.map(ci => (
                                                                    <li key={ci.ingredient_id} className="text-sm flex items-center gap-3">
                                                                        <span className="inline-block w-[3em] text-right font-medium text-foreground tabular-nums">
                                                                            {decimalToFraction(ci.qty_per_serving)}
                                                                        </span>
                                                                        <span className="text-muted-foreground text-xs">
                                                                            {ci.ingredients?.unit || ''}
                                                                        </span>
                                                                        {ci.ingredients?.id ? (
                                                                            <Link
                                                                                href={`/dashboard/${restaurantId}/ingredients`}
                                                                                className="text-foreground hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {ci.ingredients.name}
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="text-foreground">
                                                                                {ci.ingredients?.name || t('components.unknownIngredient')}
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
                                                        <div className="mt-4 border-t pt-4">
                                                            <h4 className="text-sm font-medium">{t('components.usedInMenus')}</h4>
                                                            {menuUsage.length === 0 ? (
                                                                <p className="mt-2 text-sm text-muted-foreground italic">
                                                                    {t('components.notUsedInMenus')}
                                                                </p>
                                                            ) : (
                                                                <ul className="mt-2 space-y-2">
                                                                    {menuUsage.map((usage) => (
                                                                        <li key={`${usage.menuId}-${component.id}`} className="text-sm flex items-center gap-3">
                                                                            <span className="inline-block w-[3em] text-right font-medium text-foreground tabular-nums">
                                                                                {usage.qtyPerOrder}x
                                                                            </span>
                                                                            <Link
                                                                                href={`/dashboard/${restaurantId}/menus/${usage.menuId}`}
                                                                                className="text-foreground hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {usage.menuName}
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

            {deletingComponent && (
                <DeleteComponentDialog
                    component={deletingComponent}
                    open={!!deletingComponent}
                    onOpenChange={(open: boolean) => !open && setDeletingComponent(null)}
                />
            )}
        </div>
    );
}
