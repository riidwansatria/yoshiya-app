'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import {
    type ColumnDef,
    type SortingState,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table';

import { DataTable } from '@/components/data-table/data-table';
import { DataTableColumnHeader } from '@/components/data-table/data-table-column-header';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedIngredient } from '@/lib/queries/ingredients-summary';
import { AggregatedComponent } from '@/lib/queries/components-summary';

type IngredientSummaryRow = {
    ingredient_id: string;
    name: string;
    unit: string;
    category: string;
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

function isUncategorizedCategory(category: string) {
    return category.trim().toLowerCase() === 'uncategorized';
}

function toSafeText(value: unknown) {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return '';
    return String(value);
}

export function SummaryPrintView({
    restaurantId,
    fromDate,
    toDate,
    groupedIngredients,
    components,
}: {
    restaurantId: string;
    fromDate: string;
    toDate: string;
    groupedIngredients: Record<string, AggregatedIngredient[]>;
    components: AggregatedComponent[];
}) {
    const router = useRouter();
    const t = useTranslations('kitchen.summary');
    const tCommon = useTranslations('kitchen.common');
    const locale = useLocale();
    const [pendingRange, setPendingRange] = useState<{ from: string; to: string } | null>(null);
    const [isNavigating, startTransition] = useTransition();
    const [ingredientsSorting, setIngredientsSorting] = useState<SortingState>([
        { id: 'category', desc: false },
        { id: 'name', desc: false },
    ]);
    const [componentsSorting, setComponentsSorting] = useState<SortingState>([
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

    const categories = useMemo(() => Object.keys(groupedIngredients).sort(), [groupedIngredients]);
    const hasIngredients = categories.length > 0;
    const hasComponents = components.length > 0;

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

    const ingredientsTable = useReactTable({
        data: ingredientRows,
        columns: ingredientColumns,
        state: { sorting: ingredientsSorting },
        onSortingChange: setIngredientsSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: false,
        initialState: {
            pagination: { pageSize: 20 },
        },
    });

    const componentsTableModel = useReactTable({
        data: componentRows,
        columns: componentColumns,
        state: { sorting: componentsSorting },
        onSortingChange: setComponentsSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: false,
        initialState: {
            pagination: { pageSize: 20 },
        },
    });

    return (
        <div className="flex flex-col h-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4 shrink-0">
                <div className="flex items-center gap-4">
                    <label className="font-semibold whitespace-nowrap">{t('targetDate')}:</label>
                    <DateRangePicker
                        from={rangeFrom}
                        to={rangeTo}
                        onChange={handleRangeChange}
                        locale={locale === 'ja' ? 'ja' : 'en'}
                        disabled={isNavigating}
                    />
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={isNavigating || (!hasIngredients && !hasComponents)}>
                    <Printer className="mr-2 h-4 w-4" /> {t('printButton')}
                </Button>
            </div>

            <Tabs defaultValue="ingredients" className="flex-1 min-h-0 flex flex-col">
                <TabsList>
                    <TabsTrigger value="ingredients">{t('ingredientsTab')}</TabsTrigger>
                    <TabsTrigger value="components">{t('componentsTab')}</TabsTrigger>
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
                        <DataTable table={ingredientsTable} />
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
                        <DataTable table={componentsTableModel} />
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
