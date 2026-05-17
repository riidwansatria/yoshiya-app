'use client';

import { Fragment, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { FilePlus2, Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
    type ColumnDef,
    type Row,
    type SortingState,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';

import { DataTableColumnHeader } from '@/components/dice-ui/data-table/data-table-column-header';
import { DataTableSortList } from '@/components/dice-ui/data-table/data-table-sort-list';
import { DataTableToolbar } from '@/components/dice-ui/data-table/data-table-toolbar';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { AggregatedIngredient } from '@/lib/queries/ingredients-summary';
import { AggregatedComponent } from '@/lib/queries/components-summary';
import { AggregatedMenu } from '@/lib/queries/menus-summary';
import { createPurchaseOrderFromSummary } from '@/lib/actions/purchase-orders';

type IngredientSummaryRow = {
    ingredient_id: string;
    name: string;
    unit: string;
    category: string;
    vendor_id: string | null;
    vendor_name: string | null;
    total_quantity: number;
    package_size: number | null;
    package_label: string | null;
    packages_needed: number | null;
};

type ComponentSummaryRow = {
    component_id: string;
    name: string;
    total_quantity: number;
    description: string | null;
};

type MenuSummaryRow = {
    menu_id: string;
    name: string;
    total_quantity: number;
};

type IngredientSummaryGroup = {
    key: string;
    label: string;
    rows: Row<IngredientSummaryRow>[];
};

function isUncategorizedCategory(category: string) {
    return category.trim().toLowerCase() === 'uncategorized';
}

function toSafeText(value: unknown) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
}

function getLocalIsoDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function groupIngredientRowsByVendor(
    rows: Row<IngredientSummaryRow>[],
    fallbackLabel: string
): IngredientSummaryGroup[] {
    const groups = new Map<string, IngredientSummaryGroup>();

    for (const row of rows) {
        const vendorName = toSafeText(row.original.vendor_name).trim();
        const key = row.original.vendor_id ?? '__none__';
        const label = vendorName || fallbackLabel;
        const group = groups.get(key);

        if (group) {
            group.rows.push(row);
        } else {
            groups.set(key, { key, label, rows: [row] });
        }
    }

    return Array.from(groups.values()).sort((a, b) => {
        const aLabel = a.key === '__none__' ? '' : a.label;
        const bLabel = b.key === '__none__' ? '' : b.label;
        return aLabel.localeCompare(bLabel);
    });
}

export function SummaryPrintView({
    restaurantId,
    fromDate,
    toDate,
    groupedIngredients,
    components,
    menus,
}: {
    restaurantId: string;
    fromDate: string;
    toDate: string;
    groupedIngredients: Record<string, AggregatedIngredient[]>;
    components: AggregatedComponent[];
    menus: AggregatedMenu[];
}) {
    const router = useRouter();
    const t = useTranslations('kitchen.summary');
    const tCommon = useTranslations('kitchen.common');
    const locale = useLocale();
    const [pendingRange, setPendingRange] = useState<{ from: string; to: string } | null>(null);
    const [isNavigating, startTransition] = useTransition();
    const [creatingPurchaseOrderFor, setCreatingPurchaseOrderFor] = useState<string | null>(null);
    const [ingredientsSorting, setIngredientsSorting] = useState<SortingState>([
        { id: 'category', desc: false },
        { id: 'name', desc: false },
    ]);
    const [componentsSorting, setComponentsSorting] = useState<SortingState>([
        { id: 'name', desc: false },
    ]);
    const [menusSorting, setMenusSorting] = useState<SortingState>([
        { id: 'name', desc: false },
    ]);

    const rangeFrom = pendingRange?.from ?? fromDate;
    const rangeTo = pendingRange?.to ?? toDate;

    useEffect(() => {
        if (pendingRange && pendingRange.from === fromDate && pendingRange.to === toDate) {
            setPendingRange(null);
        }
    }, [restaurantId, fromDate, toDate, groupedIngredients, components, pendingRange]);

    const handleRangeChange = (newFrom: string, newTo: string) => {
        if (newFrom === fromDate && newTo === toDate) {
            return;
        }

        const params = new URLSearchParams({ from: newFrom, to: newTo });
        const nextUrl = `/dashboard/${restaurantId}/kitchen/summary?${params.toString()}`;

        setPendingRange({ from: newFrom, to: newTo });
        startTransition(() => {
            router.push(nextUrl);
        });
    };

    const handlePrint = () => {
        const printUrl = `/print/${restaurantId}/kitchen/summary?from=${rangeFrom}&to=${rangeTo}&locale=${locale}`;
        window.open(printUrl, '_blank', 'noopener,noreferrer');
    };

    const handleCreatePurchaseOrder = async (group: IngredientSummaryGroup) => {
        setCreatingPurchaseOrderFor(group.key);
        const result = await createPurchaseOrderFromSummary(
            restaurantId,
            group.label,
            getLocalIsoDate(),
            rangeFrom,
            rangeTo,
            group.rows.map((row) => ({
                ingredient_id: row.original.ingredient_id,
                item_name: row.original.name,
                unit: row.original.unit,
                category: row.original.category,
                order_quantity: row.original.packages_needed ?? row.original.total_quantity,
            })),
            group.key !== '__none__' ? group.key : null
        );
        setCreatingPurchaseOrderFor(null);

        if (result.error) {
            toast.error(result.error);
            return;
        }

        toast.success(t('purchaseOrderCreateSuccess'));
        router.push(`/dashboard/${restaurantId}/kitchen/purchase-orders/${result.id}`);
    };

    const categories = useMemo(() => Object.keys(groupedIngredients).sort(), [groupedIngredients]);
    const hasIngredients = categories.length > 0;
    const hasComponents = components.length > 0;
    const hasMenus = menus.length > 0;

    const ingredientRows = useMemo<IngredientSummaryRow[]>(
        () => categories.flatMap((category) => groupedIngredients[category]),
        [categories, groupedIngredients]
    );

    const componentRows = useMemo<ComponentSummaryRow[]>(
        () => components.map((component) => ({
            component_id: component.component_id,
            name: component.name,
            total_quantity: component.total_quantity,
            description: component.description,
        })),
        [components]
    );

    const menuRows = useMemo<MenuSummaryRow[]>(
        () => menus.map((menu) => ({
            menu_id: menu.menu_id,
            name: menu.name,
            total_quantity: menu.total_quantity,
        })),
        [menus]
    );

    const ingredientColumns = useMemo<ColumnDef<IngredientSummaryRow>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('ingredientColumn')} />
                ),
                cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
            },
            {
                id: 'category',
                accessorKey: 'category',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={tCommon('category')} />
                ),
                cell: ({ row }) => {
                    const category = toSafeText(row.original.category).trim();
                    return (
                        <span className="text-muted-foreground">
                            {isUncategorizedCategory(category) ? tCommon('none') : (category || tCommon('none'))}
                        </span>
                    );
                },
            },
            {
                id: 'total_quantity',
                accessorKey: 'total_quantity',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('needColumn')} />
                ),
                cell: ({ row }) => (
                    <span className="tabular-nums text-muted-foreground">
                        {row.original.total_quantity} {row.original.unit}
                    </span>
                ),
            },
            {
                id: 'packages_needed',
                accessorKey: 'packages_needed',
                sortingFn: 'alphanumeric',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('orderColumn')} />
                ),
                cell: ({ row }) => (
                    <span className="tabular-nums font-bold">
                        {row.original.packages_needed ?? '—'}
                    </span>
                ),
            },
            {
                id: 'pack',
                enableSorting: false,
                header: () => <span>{t('packColumn')}</span>,
                cell: ({ row }) => {
                    const item = row.original;
                    const hasPack = item.packages_needed !== null && item.package_size != null;
                    const packageLabel = toSafeText(item.package_label).trim();
                    return hasPack ? (
                        <span className="text-xs text-muted-foreground">
                            × {item.package_size}{item.unit} {packageLabel || t('defaultPackLabel')}
                        </span>
                    ) : null;
                },
            },
        ],
        [t, tCommon]
    );

    const componentColumns = useMemo<ColumnDef<ComponentSummaryRow>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('componentColumn')} />
                ),
                cell: ({ row }) => (
                    <div>
                        <div className="font-medium">{toSafeText(row.original.name)}</div>
                        {toSafeText(row.original.description).trim() ? (
                            <span className="block text-xs text-muted-foreground font-normal">
                                {toSafeText(row.original.description)}
                            </span>
                        ) : null}
                    </div>
                ),
            },
            {
                id: 'total_quantity',
                accessorKey: 'total_quantity',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('totalQtyColumn')} />
                ),
                cell: ({ row }) => (
                    <span className="tabular-nums font-semibold">{row.original.total_quantity}</span>
                ),
            },
        ],
        [t]
    );

    const menuColumns = useMemo<ColumnDef<MenuSummaryRow>[]>(
        () => [
            {
                id: 'name',
                accessorKey: 'name',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('menuColumn')} />
                ),
                cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
            },
            {
                id: 'total_quantity',
                accessorKey: 'total_quantity',
                header: ({ column }) => (
                    <DataTableColumnHeader column={column} label={t('totalQtyColumn')} />
                ),
                cell: ({ row }) => (
                    <span className="tabular-nums font-semibold">{row.original.total_quantity}</span>
                ),
            },
        ],
        [t]
    );

    const ingredientsTable = useReactTable({
        data: ingredientRows,
        columns: ingredientColumns,
        state: { sorting: ingredientsSorting },
        onSortingChange: setIngredientsSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: false,
    });

    const ingredientGroups = groupIngredientRowsByVendor(
        ingredientsTable.getRowModel().rows,
        tCommon('none')
    );

    const componentsTableModel = useReactTable({
        data: componentRows,
        columns: componentColumns,
        state: { sorting: componentsSorting },
        onSortingChange: setComponentsSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: false,
    });

    const menusTableModel = useReactTable({
        data: menuRows,
        columns: menuColumns,
        state: { sorting: menusSorting },
        onSortingChange: setMenusSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: false,
    });

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <label className="font-semibold whitespace-nowrap">{t('targetDate')}:</label>
                    <DatePicker
                        value={rangeFrom}
                        onChange={(newFrom) => handleRangeChange(newFrom, newFrom > rangeTo ? newFrom : rangeTo)}
                        locale={locale === 'ja' ? 'ja' : 'en'}
                        disabled={isNavigating}
                    />
                    <span className="text-muted-foreground">—</span>
                    <DatePicker
                        value={rangeTo}
                        onChange={(newTo) => handleRangeChange(newTo < rangeFrom ? newTo : rangeFrom, newTo)}
                        locale={locale === 'ja' ? 'ja' : 'en'}
                        disabled={isNavigating}
                    />
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={isNavigating || (!hasIngredients && !hasComponents && !hasMenus)}>
                    <Printer className="mr-2 h-4 w-4" /> {t('printButton')}
                </Button>
            </div>

            <Tabs defaultValue="ingredients" className="flex-1 min-h-0 flex flex-col">
                <TabsList>
                    <TabsTrigger value="ingredients">{t('ingredientsTab')}</TabsTrigger>
                    <TabsTrigger value="components">{t('componentsTab')}</TabsTrigger>
                    <TabsTrigger value="menus">{t('menusTab')}</TabsTrigger>
                </TabsList>

                {/* ─── Ingredients tab ─── */}
                <TabsContent value="ingredients" className="flex-1 min-h-0 overflow-y-auto mt-4">
                    {!hasIngredients ? (
                        <div className="text-center p-12 border border-dashed rounded-md bg-muted/20">
                            <p className="text-lg text-muted-foreground">{t('noIngredients')}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('noIngredientsHint')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex w-full flex-col gap-2.5 overflow-auto">
                            <DataTableToolbar table={ingredientsTable}>
                                <DataTableSortList table={ingredientsTable} />
                            </DataTableToolbar>
                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader>
                                        {ingredientsTable.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead
                                                        key={header.id}
                                                        colSpan={header.colSpan}
                                                        style={{ width: header.getSize() }}
                                                    >
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
                                        {ingredientGroups.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={ingredientsTable.getAllColumns().length}
                                                    className="h-24 text-center"
                                                >
                                                    {t('noIngredients')}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ingredientGroups.map((group) => (
                                                <Fragment key={group.key}>
                                                    <TableRow className="bg-muted hover:bg-muted">
                                                        <TableCell
                                                            colSpan={ingredientsTable.getVisibleFlatColumns().length}
                                                            className="px-2 py-2 text-sm font-medium text-muted-foreground/70"
                                                        >
                                                            <div className="flex items-center justify-between gap-2">
                                                                <span>{group.label}</span>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => handleCreatePurchaseOrder(group)}
                                                                    disabled={creatingPurchaseOrderFor === group.key}
                                                                >
                                                                    <FilePlus2 />
                                                                    {t('createPurchaseOrder')}
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                    {group.rows.map((row) => (
                                                        <TableRow key={row.id}>
                                                            {row.getVisibleCells().map((cell) => (
                                                                <TableCell key={cell.id}>
                                                                    {flexRender(
                                                                        cell.column.columnDef.cell,
                                                                        cell.getContext()
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    ))}
                                                </Fragment>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ─── Components tab ─── */}
                <TabsContent value="components" className="flex-1 min-h-0 overflow-y-auto mt-4">
                    {!hasComponents ? (
                        <div className="text-center p-12 border border-dashed rounded-md bg-muted/20">
                            <p className="text-lg text-muted-foreground">{t('noComponents')}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('noComponentsHint')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex w-full flex-col gap-2.5 overflow-auto">
                            <DataTableToolbar table={componentsTableModel}>
                                <DataTableSortList table={componentsTableModel} />
                            </DataTableToolbar>
                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader>
                                        {componentsTableModel.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead
                                                        key={header.id}
                                                        colSpan={header.colSpan}
                                                        style={{ width: header.getSize() }}
                                                    >
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
                                        {componentsTableModel.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* ─── Menus tab ─── */}
                <TabsContent value="menus" className="flex-1 min-h-0 overflow-y-auto mt-4">
                    {!hasMenus ? (
                        <div className="text-center p-12 border border-dashed rounded-md bg-muted/20">
                            <p className="text-lg text-muted-foreground">{t('noMenus')}</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                {t('noMenusHint')}
                            </p>
                        </div>
                    ) : (
                        <div className="flex w-full flex-col gap-2.5 overflow-auto">
                            <DataTableToolbar table={menusTableModel}>
                                <DataTableSortList table={menusTableModel} />
                            </DataTableToolbar>
                            <div className="overflow-hidden rounded-md border">
                                <Table>
                                    <TableHeader>
                                        {menusTableModel.getHeaderGroups().map((headerGroup) => (
                                            <TableRow key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <TableHead
                                                        key={header.id}
                                                        colSpan={header.colSpan}
                                                        style={{ width: header.getSize() }}
                                                    >
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
                                        {menusTableModel.getRowModel().rows.map((row) => (
                                            <TableRow key={row.id}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <TableCell key={cell.id}>
                                                        {flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
