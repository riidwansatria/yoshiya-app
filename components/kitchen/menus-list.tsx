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
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableSortList } from '@/components/data-table/data-table-sort-list';
import { DeleteMenuDialog } from './menu-dialogs';
import { duplicateMenu } from '@/lib/actions/menus';

// Multi-field search across name, season, description, tags, and component names
const menuSearchFilterFn: FilterFn<Menu> = (row, _columnId, filterValue) => {
    const q = String(filterValue).toLowerCase().trim();
    if (!q) return true;
    const m = row.original;
    return (
        m.name.toLowerCase().includes(q) ||
        (m.season ?? '').toLowerCase().includes(q) ||
        (m.description ?? '').toLowerCase().includes(q) ||
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
    const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({ tags: false });

    const tagOptions = useMemo(
        () => availableTags.map((tag) => ({ label: tag.label, value: tag.id })),
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
                                href={`/dashboard/${restaurantId}/menus/${menu.id}`}
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
                // Hidden column — only used for tag filtering via the toolbar
                id: 'tags',
                accessorFn: (row) => (row.tags ?? []).map((t) => t.id),
                enableSorting: false,
                enableHiding: false,
                enableColumnFilter: true,
                filterFn: menuTagsFilterFn,
                meta: {
                    label: t('menus.tags.label'),
                    variant: 'multiSelect',
                    options: tagOptions,
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
                                        router.push(`/dashboard/${restaurantId}/menus/${menu.id}`);
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
                                                `/dashboard/${restaurantId}/menus/${result.data.id}`
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
        [t, restaurantId, router, duplicatingId, tagOptions]
    );

    const table = useReactTable({
        data: initialData,
        columns,
        state: { sorting, expanded, columnFilters, columnVisibility },
        onSortingChange: setSorting,
        onExpandedChange: setExpanded,
        onColumnFiltersChange: setColumnFilters,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });

    const hasActiveFilters = columnFilters.length > 0;

    return (
        <div className="flex flex-col h-full space-y-4 min-h-0">
            <DataTableToolbar table={table} className="shrink-0 p-0">
                <DataTableSortList table={table} />
            </DataTableToolbar>

            <div className="rounded-md border flex-1 overflow-y-auto min-h-0">
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
                                    colSpan={columns.length}
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
                                                colSpan={columns.length}
                                                className="p-0 border-b"
                                            >
                                                <div className="p-4 pl-14">
                                                    {(row.original.tags ?? []).length > 0 && (
                                                        <div className="mb-4 flex flex-wrap gap-2">
                                                            {(row.original.tags ?? []).map((tag) => (
                                                                <Badge key={tag.id} variant="secondary">
                                                                    {tag.label}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    )}
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
                                                                            href={`/dashboard/${restaurantId}/components/${mc.components.id}`}
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
