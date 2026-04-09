'use client';

import type { Menu } from '@/lib/queries/menus';
import type { MenuTag } from '@/lib/queries/menu-tags';
import type { MenuTagFilterSelection } from '@/lib/utils/menu-tags';
import { menuMatchesTagFilters } from '@/lib/utils/menu-tags';
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
import { Badge } from '@/components/ui/badge';
import { useCallback, useState, useMemo, Fragment } from 'react';
import { ChevronDown, ChevronRight, MoreHorizontal, Search, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DeleteMenuDialog } from './menu-dialogs';
import { MenuTagFilter } from './menu-tag-filter';
import { duplicateMenu } from '@/lib/actions/menus';

export function MenusList({
    initialData,
    availableTags,
    restaurantId,
}: {
    initialData: Menu[];
    availableTags: MenuTag[];
    restaurantId: string;
}) {
    const t = useTranslations('kitchen');
    const router = useRouter();
    const [deletingMenu, setDeletingMenu] = useState<Menu | null>(null);
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [tagFilters, setTagFilters] = useState<MenuTagFilterSelection[]>([]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return initialData.filter((menu) => {
            const matchesSearch = !q ||
                menu.name.toLowerCase().includes(q) ||
                (menu.season ?? '').toLowerCase().includes(q) ||
                (menu.description ?? '').toLowerCase().includes(q) ||
                (menu.tags ?? []).some((tag) => tag.label.toLowerCase().includes(q)) ||
                (menu.menu_components ?? []).some((menuComponent) =>
                    (menuComponent.components?.name ?? '').toLowerCase().includes(q)
                );

            if (!matchesSearch) {
                return false;
            }

            return menuMatchesTagFilters(
                (menu.tags ?? []).map((tag) => tag.id),
                tagFilters
            );
        });
    }, [initialData, search, tagFilters]);

    const allFilteredExpanded = useMemo(
        () => filtered.length > 0 && filtered.every((menu) => expandedRows.has(menu.id)),
        [expandedRows, filtered]
    );

    const toggleRow = useCallback((menuId: string) => {
        setExpandedRows((prev) => {
            const next = new Set(prev);
            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
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
                filtered.forEach((menu) => {
                    next.delete(menu.id);
                });
                return next;
            }

            filtered.forEach((menu) => {
                next.add(menu.id);
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
                        placeholder={t('menus.searchPlaceholder')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
                <MenuTagFilter tags={availableTags} value={tagFilters} onChange={setTagFilters} />
            </div>
            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
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
                            <TableHead>{t('common.price')}</TableHead>
                            <TableHead>{t('common.description')}</TableHead>
                            <TableHead className="w-25">{t('common.actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filtered.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {search || tagFilters.length > 0
                                        ? t('menus.noResultsMatchingFilters')
                                        : t('menus.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filtered.map((menu) => {
                                const isExpanded = expandedRows.has(menu.id);
                                return (
                                    <Fragment key={menu.id}>
                                        <TableRow
                                            className="cursor-pointer hover:bg-muted/50"
                                            onClick={() => toggleRow(menu.id)}
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
                                                <div className="flex items-center gap-2">
                                                    {menu.color && (
                                                        <div
                                                            className="h-3 w-3 rounded-full"
                                                            style={{ backgroundColor: menu.color }}
                                                        />
                                                    )}
                                                    <Link
                                                        href={`/dashboard/${restaurantId}/menus/${menu.id}`}
                                                        className="hover:underline"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {menu.name}
                                                    </Link>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {menu.price !== null ? `¥${menu.price.toLocaleString()}` : t('common.none')}
                                            </TableCell>
                                            <TableCell className="max-w-75 truncate text-muted-foreground">
                                                {menu.description || t('common.none')}
                                            </TableCell>
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
                                                                router.push(`/dashboard/${restaurantId}/menus/${menu.id}`)
                                                            }
                                                        >
                                                            {t('common.viewEdit')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            disabled={duplicatingId === menu.id}
                                                            onClick={async () => {
                                                                setDuplicatingId(menu.id);
                                                                const result = await duplicateMenu(menu.id);
                                                                setDuplicatingId(null);
                                                                if (result?.data?.id) {
                                                                    router.push(`/dashboard/${restaurantId}/menus/${result.data.id}`);
                                                                }
                                                            }}
                                                        >
                                                            {duplicatingId === menu.id ? t('common.duplicating') : t('common.duplicate')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-red-600 focus:text-red-600"
                                                            onClick={() => setDeletingMenu(menu)}
                                                        >
                                                            {t('common.delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>

                                        {isExpanded && (
                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                <TableCell colSpan={5} className="p-0 border-b">
                                                    <div className="p-4 pl-14">
                                                        {(menu.tags ?? []).length > 0 ? (
                                                            <div className="mb-4 flex flex-wrap gap-2">
                                                                {(menu.tags ?? []).map((tag) => (
                                                                    <Badge key={tag.id} variant="secondary">
                                                                        {tag.label}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        ) : null}
                                                        {(!menu.menu_components || menu.menu_components.length === 0) ? (
                                                            <p className="text-sm text-muted-foreground italic">{t('menus.noComponentsMapped')}</p>
                                                        ) : (
                                                            <ul className="space-y-2">
                                                                {menu.menu_components.map(mc => (
                                                                    <li key={mc.component_id} className="text-sm flex items-center gap-3">
                                                                        <span className="inline-block w-[1.5em] text-right font-medium text-foreground">
                                                                            {mc.qty_per_order}x
                                                                        </span>
                                                                        {mc.components?.id ? (
                                                                            <Link
                                                                                href={`/dashboard/${restaurantId}/components/${mc.components.id}`}
                                                                                className="text-foreground hover:underline"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                            >
                                                                                {mc.components.name}
                                                                            </Link>
                                                                        ) : (
                                                                            <span className="text-foreground">
                                                                                {mc.components?.name || t('components.unknownComponent')}
                                                                            </span>
                                                                        )}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        )}
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

            {deletingMenu && (
                <DeleteMenuDialog
                    menu={deletingMenu}
                    open={!!deletingMenu}
                    onOpenChange={(open: boolean) => !open && setDeletingMenu(null)}
                />
            )}
        </div>
    );
}
