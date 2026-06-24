'use client';

import { ChangeEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RecipeComponent } from '@/lib/queries/components';
import type { Ingredient } from '@/lib/queries/ingredients';
import { applyComponentMatrixChanges } from '@/lib/actions/matrix-merge';
import { compareMatrixCsv, MatrixCompareResult, MatrixChange } from '@/lib/utils/matrix-csv-compare';
import { Download, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { stringifyCsv } from '@/lib/kitchen/import-csv';
import { buildDashboardKitchenImportPath } from '@/lib/constants/routes';

interface ComponentMatrixExportProps {
    components: RecipeComponent[];
    ingredients: Ingredient[];
    restaurantId: string;
    restaurantName: string;
}

export function ComponentMatrixExport({
    components,
    ingredients,
    restaurantId,
    restaurantName,
}: ComponentMatrixExportProps) {
    const router = useRouter();
    const [compareResult, setCompareResult] = useState<MatrixCompareResult | null>(null);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const lookup = useMemo(() => {
        const nextLookup = new Map<string, Map<string, number>>();

        for (const component of components) {
            const inner = new Map<string, number>();
            for (const ci of component.component_ingredients ?? []) {
                inner.set(ci.ingredient_id, ci.batch_quantity);
            }
            nextLookup.set(component.id, inner);
        }
        return nextLookup;
    }, [components]);

    const ingredientColumnNames = useMemo(
        () => ingredients.map((ingredient) => `${ingredient.name} (${ingredient.unit})`),
        [ingredients]
    );

    const lookupByName = useMemo(() => {
        const ingredientNameById = new Map<string, string>();
        for (const ingredient of ingredients) {
            ingredientNameById.set(ingredient.id, `${ingredient.name} (${ingredient.unit})`);
        }

        const next = new Map<string, Map<string, number>>();
        for (const component of components) {
            const row = new Map<string, number>();
            for (const ci of component.component_ingredients ?? []) {
                const ingredientColumnName = ingredientNameById.get(ci.ingredient_id);
                if (!ingredientColumnName) {
                    continue;
                }
                row.set(ingredientColumnName, ci.batch_quantity);
            }
            next.set(component.name, row);
        }

        return next;
    }, [components, ingredients]);

    const componentIdByName = useMemo(() => {
        const next = new Map<string, string>();
        for (const component of components) {
            next.set(component.name, component.id);
        }

        return next;
    }, [components]);

    const ingredientIdByColumnName = useMemo(() => {
        const next = new Map<string, string>();
        for (const ingredient of ingredients) {
            next.set(`${ingredient.name} (${ingredient.unit})`, ingredient.id);
        }

        return next;
    }, [ingredients]);

    const buildCsv = useCallback((): string => {
        const header = ['Component', ...ingredientColumnNames];
        const rows = components.map((component) => {
            return Object.fromEntries([
                ['Component', component.name],
                ...ingredients.map((ingredient) => [
                    `${ingredient.name} (${ingredient.unit})`,
                    lookup.get(component.id)?.get(ingredient.id) ?? '',
                ]),
            ]);
        });
        return stringifyCsv(header, rows);
    }, [ingredientColumnNames, ingredients, lookup, components]);

    const downloadCsv = () => {
        const csv = buildCsv();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'component-ingredient-matrix.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    const onUploadCsv = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        const csvText = await file.text();

        const result = compareMatrixCsv({
            csvText,
            currentRows: components.map((component) => component.name),
            currentColumns: ingredientColumnNames,
            getCurrentValue: (rowName, columnName) => lookupByName.get(rowName)?.get(columnName),
        });

        setCompareResult(result);
        setUploadedFileName(file.name);

        // Reset input value so selecting the same file triggers onChange again.
        event.target.value = '';
    };

    const openPicker = () => {
        fileInputRef.current?.click();
    };

    const formatValue = (value: number | null) => {
        if (value === null) {
            return 'empty';
        }

        return Number.isInteger(value) ? String(value) : value.toString();
    };

    const changeTypeBadge = (type: MatrixChange['type']) => {
        if (type === 'added') {
            return <Badge className="bg-emerald-600 text-white">Added</Badge>;
        }

        if (type === 'removed') {
            return <Badge variant="destructive">Removed</Badge>;
        }

        return <Badge variant="secondary">Changed</Badge>;
    };

    const applyChanges = async () => {
        if (!compareResult || compareResult.changes.length === 0 || isApplying) {
            return;
        }

        const payload = compareResult.changes
            .map((change) => {
                const componentId = componentIdByName.get(change.rowName);
                const ingredientId = ingredientIdByColumnName.get(change.columnName);

                if (!componentId || !ingredientId) {
                    return null;
                }

                return {
                    component_id: componentId,
                    ingredient_id: ingredientId,
                    uploadedValue: change.uploadedValue,
                };
            })
            .filter((row): row is { component_id: string; ingredient_id: string; uploadedValue: number | null } => row !== null);

        const unresolved = compareResult.changes.length - payload.length;
        if (unresolved > 0) {
            toast.error(`${unresolved} changes could not be mapped to IDs. Please re-upload CSV.`);
            return;
        }

        const confirmed = window.confirm(
            `Apply ${payload.length} change(s) to ${restaurantName}? Blank matched cells remove relationships. All changes apply together.`
        );
        if (!confirmed) {
            return;
        }

        setIsApplying(true);
        const result = await applyComponentMatrixChanges(restaurantId, payload);
        setIsApplying(false);

        if ('error' in result) {
            toast.error(result.error);
            return;
        }

        toast.success(`Applied ${result.applied ?? payload.length} changes.`);
        setCompareResult(null);
        setUploadedFileName(null);
        router.refresh();
    };

    const hasBlockingErrors = Boolean(
        compareResult &&
        (
            compareResult.issues.some((issue) => issue.severity === 'error') ||
            compareResult.unknownRows.length > 0 ||
            compareResult.unknownColumns.length > 0
        )
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {components.length} components × {ingredients.length} ingredients
                </p>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href={buildDashboardKitchenImportPath(restaurantId)}>AI import</Link>
                    </Button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={onUploadCsv}
                    />
                    <Button variant="outline" size="sm" onClick={openPicker}>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload CSV
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadCsv}>
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                    </Button>
                </div>
            </div>
            <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                Spreadsheet editing for {restaurantName}. A blank matched cell removes that relationship.
                Unknown rows or columns block Apply; omitted rows and columns are warnings only.
            </p>

            {compareResult && (
                <div className="rounded-md border p-3 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">CSV compare:</span>
                        <Badge variant="outline">{uploadedFileName ?? 'uploaded.csv'}</Badge>
                        <Badge variant="secondary">{compareResult.changes.length} changed cells</Badge>
                        <Button
                            variant="default"
                            size="sm"
                            onClick={applyChanges}
                            disabled={compareResult.changes.length === 0 || isApplying || hasBlockingErrors}
                        >
                            {isApplying ? 'Applying...' : 'Apply Changes'}
                        </Button>
                        {compareResult.issues.length > 0 && (
                            <Badge variant="destructive">{compareResult.issues.length} issues</Badge>
                        )}
                        {compareResult.unknownRows.length > 0 && (
                            <Badge variant="destructive">{compareResult.unknownRows.length} CSV-only component rows</Badge>
                        )}
                        {compareResult.unknownColumns.length > 0 && (
                            <Badge variant="destructive">{compareResult.unknownColumns.length} CSV-only ingredient columns</Badge>
                        )}
                        {compareResult.missingRows.length > 0 && (
                            <Badge variant="outline">{compareResult.missingRows.length} app components not in CSV</Badge>
                        )}
                        {compareResult.missingColumns.length > 0 && (
                            <Badge variant="outline">{compareResult.missingColumns.length} app ingredient columns not in CSV</Badge>
                        )}
                    </div>

                    {compareResult.changes.length > 0 ? (
                        <div className="rounded-md border overflow-auto max-h-64">
                            <table className="w-full text-sm">
                                <thead className="bg-background sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-left border-b whitespace-nowrap">Type</th>
                                        <th className="px-3 py-2 text-left border-b whitespace-nowrap">Component</th>
                                        <th className="px-3 py-2 text-left border-b whitespace-nowrap">Ingredient</th>
                                        <th className="px-3 py-2 text-right border-b whitespace-nowrap">Current</th>
                                        <th className="px-3 py-2 text-right border-b whitespace-nowrap">CSV</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {compareResult.changes.map((change) => (
                                        <tr key={`${change.rowName}-${change.columnName}-${change.type}`} className="border-b last:border-0">
                                            <td className="px-3 py-2">{changeTypeBadge(change.type)}</td>
                                            <td className="px-3 py-2">{change.rowName}</td>
                                            <td className="px-3 py-2">{change.columnName}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatValue(change.currentValue)}</td>
                                            <td className="px-3 py-2 text-right tabular-nums">{formatValue(change.uploadedValue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">No cell differences detected for matched components/ingredients.</p>
                    )}

                    {(compareResult.issues.length > 0 || compareResult.unknownRows.length > 0 || compareResult.unknownColumns.length > 0 || compareResult.missingRows.length > 0 || compareResult.missingColumns.length > 0) && (
                        <div className="space-y-1 text-xs text-muted-foreground">
                            {compareResult.issues.map((issue, index) => (
                                <p key={`${issue.kind}-${index}`}>• {issue.message}</p>
                            ))}
                            {compareResult.unknownRows.map((name) => (
                                <p key={`unknown-row-${name}`}>• CSV row not matched to any app component: {name}</p>
                            ))}
                            {compareResult.unknownColumns.map((name) => (
                                <p key={`unknown-col-${name}`}>• CSV column not matched to any app ingredient: {name}</p>
                            ))}
                            {compareResult.missingRows.map((name) => (
                                <p key={`missing-row-${name}`}>• App component missing from CSV rows: {name}</p>
                            ))}
                            {compareResult.missingColumns.map((name) => (
                                <p key={`missing-col-${name}`}>• App ingredient column missing from CSV: {name}</p>
                            ))}
                            {(compareResult.unknownRows.length > 0 || compareResult.missingRows.length > 0 || compareResult.unknownColumns.length > 0 || compareResult.missingColumns.length > 0) && (
                                <p>• Tip: check space differences (half-width vs full-width), which can make names look the same but not match.</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="rounded-md border overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                    <thead className="bg-background sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-r whitespace-nowrap min-w-[180px]">
                                Component ↓ / Ingredient →
                            </th>
                            {ingredients.map((ingredient) => (
                                <th
                                    key={ingredient.id}
                                    className="px-3 py-2 text-center font-medium border-b border-r whitespace-nowrap"
                                >
                                    <div>{ingredient.name}</div>
                                    <div className="text-xs font-normal text-muted-foreground">
                                        {ingredient.unit}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {components.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={ingredients.length + 1}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No components found.
                                </td>
                            </tr>
                        ) : (
                            components.map((component) => (
                                <tr key={component.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium border-r whitespace-nowrap">
                                        {component.name}
                                    </td>
                                    {ingredients.map((ingredient) => {
                                        const qty = lookup.get(component.id)?.get(ingredient.id);
                                        return (
                                            <td
                                                key={ingredient.id}
                                                className={`px-3 py-2 text-center border-r tabular-nums ${qty ? 'font-medium' : 'text-muted-foreground/40'}`}
                                            >
                                                {qty !== undefined ? qty : '–'}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
