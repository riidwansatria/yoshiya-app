'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getExpandedRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ExpandedState,
    type ColumnFiltersState,
    type ColumnOrderState,
    type VisibilityState,
    type FilterFn,
} from '@tanstack/react-table';

import type { Menu } from '@/lib/queries/menus';
import type { MenuTag } from '@/lib/queries/menu-tags';

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
import { ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { DataTableColumnHeader } from '@/components/dice-ui/data-table/data-table-column-header';
import { DataTableToolbar } from '@/components/dice-ui/data-table/data-table-toolbar';
import { DataTableSortList } from '@/components/dice-ui/data-table/data-table-sort-list';
import { DeleteMenuDialog } from './menu-dialogs';
import { duplicateMenu } from '@/lib/actions/menus';
import {
    buildDashboardComponentDetailPath,
    buildDashboardMenuDetailPath,
} from '@/lib/constants/routes';

// Multi-field search across name, description, tags, and component names
const menuSearchFilterFn: FilterFn<Menu> = (row, _columnId, filterValue) => {
    const q = String(filterValue).toLowerCase().trim();
    if (!q) return true;
    const m = row.original;
    return (
        m.name.toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q) ||
        (m.staff_memo ?? '').toLowerCase().includes(q) ||
        (m.tags ?? []).some((t) => t.label.toLowerCase().includes(q)) ||
        (m.menu_components ?? []).some((mc) =>
            (mc.components?.name ?? '').toLowerCase().includes(q)
        )
    );
};
menuSearchFilterFn.autoRemove = (val) => !val;

// Include-ALL tag filter: menu must have every selected tag
const menuTagsFilterFn: FilterFn<Menu> = (row, _columnId, filterValue: string[]) => {
    if (!filterValue.length) return true;
    const menuTagIds = new Set((row.original.tags ?? []).map((t) => t.id));
    return filterValue.every((id) => menuTagIds.has(id));
};
menuTagsFilterFn.autoRemove = (val: string[]) => !val?.length;

// Exclude tag filter: menu must NOT have any selected tag
const menuTagsExcludeFilterFn: FilterFn<Menu> = (row, _columnId, filterValue: string[]) => {
    if (!filterValue.length) return true;
    const menuTagIds = new Set((row.original.tags ?? []).map((t) => t.id));
    return !filterValue.some((id) => menuTagIds.has(id));
};
menuTagsExcludeFilterFn.autoRemove = (val: string[]) => !val?.length;

function MenuTagsCell({ tags, emptyLabel }: { tags: MenuTag[]; emptyLabel: string }) {
    if (tags.length === 0) {
        return <span className="text-muted-foreground">{emptyLabel}</span>;
    }

    return (
        <div className="flex min-w-36 flex-wrap gap-1">
            {tags.map((tag) => (
                <Badge key={tag.id} variant="outline" className="whitespace-nowrap font-normal">
                    {tag.label}
                </Badge>
            ))}
        </div>
    );
}

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
    const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [expanded, setExpanded] = useState<ExpandedState>({});
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([]);
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
        name_en: false,
        is_public: false,
        staff_memo: false,
        dietaryTags: false,
        ingredientTags: false,
        seasonTags: false,
        menuComponents: false,
    });

    const dietaryTags = useMemo(
        () => availableTags.filter((t) => t.kind === 'dietary'),
        [availableTags]
    );
    const ingredientTags = useMemo(
        () => availableTags.filter((t) => t.kind === 'ingredient'),
        [availableTags]
    );
    const seasonTags = useMemo(
        () => availableTags.filter((t) => t.kind === 'season'),
        [availableTags]
    );

    const columns = useMemo<ColumnDef<Menu>[]>(
        () => [
            {
                id: 'expand',
                enableSorting: false,
                enableHiding: false,
                enableColumnFilter: false,
                size: 40,
                header: ({ table }) => (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 cursor-pointer p-0 text-muted-foreground hover:bg-transparent"
                        onClick={() => table.toggleAllRowsExpanded()}
                        disabled={table.getRowModel().rows.length === 0}
                        title={table.getIsAllRowsExpanded() ? t('common.collapseAll') : t('common.expandAll')}
                        aria-label={table.getIsAllRowsExpanded() ? t('common.collapseAll') : t('common.expandAll')}
                    >
                        {table.getIsAllRowsExpanded() ? (
                            <ChevronsUp className="h-4 w-4" />
                        ) : (
                            <ChevronsDown className="h-4 w-4" />
                        )}
                    </Button>
                ),
                cell: ({ row }) => (
                    <span className="inline-flex h-4 w-4 items-center justify-center text-muted-foreground">
                        {row.getIsExpanded() ? (
                            <ChevronDown className="h-4 w-4" />
                        ) : (
                            <ChevronRight className="h-4 w-4" />
                        )}
                    </span>
                ),
            },
            {
                accessorKey: 'name',
                filterFn: menuSearchFilterFn,
                enableColumnFilter: true,
                meta: {
                    label: t('common.name'),
                    variant: 'text',
                    placeholder: t('menus.searchPlaceholder'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('common.name')} />
                ),
                cell: ({ row }) => {
                    const menu = row.original;
                    return (
                        <div className="flex items-center gap-2 font-medium">
                            {menu.color && (
                                <div
                                    className="h-3 w-3 rounded-full shrink-0"
                                    style={{ backgroundColor: menu.color }}
                                />
                            )}
                            <Link
                                href={buildDashboardMenuDetailPath(menu.id, restaurantId)}
                                className="hover:underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {menu.name}
                            </Link>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'price',
                enableColumnFilter: false,
                meta: {
                    label: t('common.price'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('common.price')} />
                ),
                cell: ({ row }) =>
                    row.original.price !== null
                        ? `¥${row.original.price.toLocaleString()}`
                        : t('common.none'),
            },
            {
                accessorKey: 'name_en',
                enableColumnFilter: false,
                meta: {
                    label: t('menus.form.nameEn'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('menus.form.nameEn')} />
                ),
                cell: ({ row }) => (
                    <span className="text-muted-foreground">
                        {row.original.name_en || t('common.none')}
                    </span>
                ),
            },
            {
                accessorKey: 'is_public',
                enableColumnFilter: false,
                meta: {
                    label: t('menus.columns.status'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('menus.columns.status')} />
                ),
                cell: ({ row }) => (
                    <Badge
                        variant="outline"
                        className={
                            row.original.is_public
                                ? 'border-emerald-200 bg-emerald-50 font-normal text-emerald-700'
                                : 'font-normal text-muted-foreground'
                        }
                    >
                        {row.original.is_public
                            ? t('menus.form.statusPublic')
                            : t('menus.form.statusPrivate')}
                    </Badge>
                ),
            },
            {
                accessorKey: 'description',
                enableSorting: false,
                enableColumnFilter: false,
                meta: {
                    label: t('common.description'),
                },
                header: t('common.description'),
                cell: ({ row }) => (
                    <span className="max-w-75 truncate text-muted-foreground block">
                        {row.original.description || t('common.none')}
                    </span>
                ),
            },
            {
                accessorKey: 'staff_memo',
                enableColumnFilter: false,
                meta: {
                    label: t('menus.form.staffMemo'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('menus.form.staffMemo')} />
                ),
                cell: ({ row }) => (
                    <span className="block max-w-75 truncate text-muted-foreground">
                        {row.original.staff_memo || t('common.none')}
                    </span>
                ),
            },
            {
                id: 'dietaryTags',
                accessorFn: (row) =>
                    (row.tags ?? [])
                        .filter((tag) => tag.kind === 'dietary')
                        .map((tag) => tag.label)
                        .sort((a, b) => a.localeCompare(b, 'ja'))
                        .join(' '),
                enableColumnFilter: true,
                filterFn: menuTagsFilterFn,
                meta: {
                    label: t('menus.tags.kindLabels.dietary'),
                    variant: 'multiSelect',
                    options: dietaryTags.map((tag) => ({ label: tag.label, value: tag.id })),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        label={t('menus.tags.kindLabels.dietary')}
                    />
                ),
                cell: ({ row }) => (
                    <MenuTagsCell
                        tags={(row.original.tags ?? []).filter((tag) => tag.kind === 'dietary')}
                        emptyLabel={t('common.none')}
                    />
                ),
            },
            {
                id: 'ingredientTags',
                accessorFn: (row) =>
                    (row.tags ?? [])
                        .filter((tag) => tag.kind === 'ingredient')
                        .map((tag) => tag.label)
                        .sort((a, b) => a.localeCompare(b, 'ja'))
                        .join(' '),
                enableColumnFilter: true,
                filterFn: menuTagsExcludeFilterFn,
                meta: {
                    label: t('menus.tags.kindLabels.ingredient'),
                    variant: 'multiSelect',
                    options: ingredientTags.map((tag) => ({ label: tag.label, value: tag.id })),
                    exclude: true,
                },
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        label={t('menus.tags.kindLabels.ingredient')}
                    />
                ),
                cell: ({ row }) => (
                    <MenuTagsCell
                        tags={(row.original.tags ?? []).filter((tag) => tag.kind === 'ingredient')}
                        emptyLabel={t('common.none')}
                    />
                ),
            },
            {
                id: 'seasonTags',
                accessorFn: (row) =>
                    (row.tags ?? [])
                        .filter((tag) => tag.kind === 'season')
                        .map((tag) => tag.label)
                        .sort((a, b) => a.localeCompare(b, 'ja'))
                        .join(' '),
                enableColumnFilter: true,
                filterFn: menuTagsFilterFn,
                meta: {
                    label: t('menus.tags.kindLabels.season'),
                    variant: 'multiSelect',
                    options: seasonTags.map((tag) => ({ label: tag.label, value: tag.id })),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        label={t('menus.tags.kindLabels.season')}
                    />
                ),
                cell: ({ row }) => (
                    <MenuTagsCell
                        tags={(row.original.tags ?? []).filter((tag) => tag.kind === 'season')}
                        emptyLabel={t('common.none')}
                    />
                ),
            },
            {
                id: 'menuComponents',
                accessorFn: (row) =>
                    (row.menu_components ?? [])
                        .map((item) => item.components?.name ?? '')
                        .join(' '),
                enableColumnFilter: false,
                meta: {
                    label: t('menus.form.mappedComponents'),
                },
                header: ({ column }) => (
                    <DataTableColumnHeader
                        column={column}
                        label={t('menus.form.mappedComponents')}
                    />
                ),
                cell: ({ row }) => {
                    const components = row.original.menu_components ?? [];

                    if (components.length === 0) {
                        return <span className="text-muted-foreground">{t('common.none')}</span>;
                    }

                    return (
                        <div className="flex min-w-44 flex-wrap gap-1">
                            {components.map((item) => (
                                <Badge
                                    key={item.component_id}
                                    variant="secondary"
                                    className="whitespace-nowrap font-normal"
                                >
                                    {item.qty_per_order}×{' '}
                                    {item.components?.name ?? t('components.unknownComponent')}
                                </Badge>
                            ))}
                        </div>
                    );
                },
            },
            {
                id: 'actions',
                enableSorting: false,
                enableHiding: false,
                enableColumnFilter: false,
                size: 100,
                cell: ({ row }) => {
                    const menu = row.original;
                    return (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <span className="sr-only">{t('common.openMenu')}</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(buildDashboardMenuDetailPath(menu.id, restaurantId));
                                    }}
                                >
                                    {t('common.viewEdit')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    disabled={duplicatingId === menu.id}
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        setDuplicatingId(menu.id);
                                        const result = await duplicateMenu(menu.id);
                                        setDuplicatingId(null);
                                        if (result?.data?.id) {
                                            router.push(
                                                buildDashboardMenuDetailPath(result.data.id, restaurantId)
                                            );
                                        }
                                    }}
                                >
                                    {duplicatingId === menu.id
                                        ? t('common.duplicating')
                                        : t('common.duplicate')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingMenu(menu);
                                    }}
                                >
                                    {t('common.delete')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    );
                },
            },
        ],
        [t, restaurantId, router, duplicatingId, dietaryTags, ingredientTags, seasonTags]
    );

    const table = useReactTable({
        data: initialData,
        columns,
        state: { sorting, expanded, columnFilters, columnVisibility, columnOrder },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: setColumnOrder,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    const hasActiveFilters = columnFilters.length > 0;

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <DataTableToolbar
                table={table}
                enableColumnOrdering
                className="shrink-0 p-0"
            >
                <DataTableSortList table={table} />
            </DataTableToolbar>

            <div className="min-h-0 flex-1 overflow-auto rounded-md border">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((hg) => (
                            <TableRow key={hg.id}>
                                {hg.headers.map((header) => (
                                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                                        {header.isPlaceholder
                                            ? null
                                            : flexRender(
                                                  header.column.columnDef.header,
                                                  header.getContext()
                                              )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={table.getVisibleLeafColumns().length}
                                    className="h-24 text-center"
                                >
                                    {hasActiveFilters
                                        ? t('menus.noResultsMatchingFilters')
                                        : t('menus.noResults')}
                                </TableCell>
                            </TableRow>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <Fragment key={row.id}>
                                    <TableRow
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => row.toggleExpanded()}
                                    >
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                    {row.getIsExpanded() && (
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableCell
                                                colSpan={table.getVisibleLeafColumns().length}
                                                className="p-0 border-b"
                                            >
                                                <div className="p-4 pl-14">
                                                    {!row.original.menu_components ||
                                                    row.original.menu_components.length === 0 ? (
                                                        <p className="text-sm text-muted-foreground italic">
                                                            {t('menus.noComponentsMapped')}
                                                        </p>
                                                    ) : (
                                                        <ul className="space-y-2">
                                                            {row.original.menu_components.map((mc) => (
                                                                <li
                                                                    key={mc.component_id}
                                                                    className="text-sm flex items-center gap-3"
                                                                >
                                                                    <span className="inline-block w-[1.5em] text-right font-medium text-foreground">
                                                                        {mc.qty_per_order}x
                                                                    </span>
                                                                    {mc.components?.id ? (
                                                                        <Link
                                                                            href={buildDashboardComponentDetailPath(mc.components.id, restaurantId)}
                                                                            className="text-foreground hover:underline"
                                                                            onClick={(e) =>
                                                                                e.stopPropagation()
                                                                            }
                                                                        >
                                                                            {mc.components.name}
                                                                        </Link>
                                                                    ) : (
                                                                        <span className="text-foreground">
                                                                            {mc.components?.name ||
                                                                                t('components.unknownComponent')}
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
                            ))
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
