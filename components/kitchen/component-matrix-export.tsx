'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RecipeComponent } from '@/lib/queries/components';
import { Download } from 'lucide-react';

interface ComponentMatrixExportProps {
    components: RecipeComponent[];
}

export function ComponentMatrixExport({ components }: ComponentMatrixExportProps) {
    const { ingredients, lookup } = useMemo(() => {
        const ingredientMap = new Map<string, { name: string; unit: string }>();
        const nextLookup = new Map<string, Map<string, number>>();

        for (const component of components) {
            const inner = new Map<string, number>();
            for (const ci of component.component_ingredients ?? []) {
                inner.set(ci.ingredient_id, ci.qty_per_serving);
                if (ci.ingredients) {
                    ingredientMap.set(ci.ingredient_id, {
                        name: ci.ingredients.name,
                        unit: ci.ingredients.unit,
                    });
                }
            }
            nextLookup.set(component.id, inner);
        }

        const nextIngredients = Array.from(ingredientMap.entries()).sort((a, b) =>
            a[1].name.localeCompare(b[1].name)
        );

        return { ingredients: nextIngredients, lookup: nextLookup };
    }, [components]);

    const buildCsv = useCallback((): string => {
        const header = [
            'Component',
            ...ingredients.map(([, info]) => `${info.name} (${info.unit})`),
        ];
        const rows = components.map((component) => {
            const cells = ingredients.map(([ingId]) => {
                const qty = lookup.get(component.id)?.get(ingId);
                return qty !== undefined ? String(qty) : '';
            });
            return [component.name, ...cells];
        });

        const escape = (val: string) =>
            val.includes(',') || val.includes('"') || val.includes('\n')
                ? `"${val.replace(/"/g, '""')}"`
                : val;

        return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    }, [ingredients, lookup, components]);

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

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {components.length} components × {ingredients.length} ingredients
                </p>
                <Button variant="outline" size="sm" onClick={downloadCsv}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                </Button>
            </div>

            <div className="rounded-md border overflow-auto max-h-[60vh]">
                <table className="w-full text-sm">
                    <thead className="bg-background sticky top-0 z-10">
                        <tr>
                            <th className="px-3 py-2 text-left font-medium text-muted-foreground border-b border-r whitespace-nowrap min-w-[180px]">
                                Component ↓ / Ingredient →
                            </th>
                            {ingredients.map(([ingId, info]) => (
                                <th
                                    key={ingId}
                                    className="px-3 py-2 text-center font-medium border-b border-r whitespace-nowrap"
                                >
                                    <div>{info.name}</div>
                                    <div className="text-xs font-normal text-muted-foreground">
                                        {info.unit}
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
                                    {ingredients.map(([ingId]) => {
                                        const qty = lookup.get(component.id)?.get(ingId);
                                        return (
                                            <td
                                                key={ingId}
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
