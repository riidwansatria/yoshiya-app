'use client';

import { useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Menu } from '@/lib/queries/menus';
import { Download } from 'lucide-react';

interface MenuMatrixExportProps {
    menus: Menu[];
}

export function MenuMatrixExport({ menus }: MenuMatrixExportProps) {
    const { components, lookup } = useMemo(() => {
        const componentMap = new Map<string, string>();
        const nextLookup = new Map<string, Map<string, number>>();

        for (const menu of menus) {
            const inner = new Map<string, number>();
            for (const mc of menu.menu_components ?? []) {
                inner.set(mc.component_id, mc.qty_per_order);
                if (mc.components) {
                    componentMap.set(mc.components.id, mc.components.name);
                }
            }
            nextLookup.set(menu.id, inner);
        }

        const nextComponents = Array.from(componentMap.entries()).sort((a, b) =>
            a[1].localeCompare(b[1])
        );

        return { components: nextComponents, lookup: nextLookup };
    }, [menus]);

    const buildCsv = useCallback((): string => {
        const header = ['Menu', ...components.map(([, name]) => name)];
        const rows = menus.map((menu) => {
            const cells = components.map(([compId]) => {
                const qty = lookup.get(menu.id)?.get(compId);
                return qty !== undefined ? String(qty) : '';
            });
            return [menu.name, ...cells];
        });

        const escape = (val: string) =>
            val.includes(',') || val.includes('"') || val.includes('\n')
                ? `"${val.replace(/"/g, '""')}"`
                : val;

        return [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    }, [components, lookup, menus]);

    const downloadCsv = () => {
        const csv = buildCsv();
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'menu-component-matrix.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Preview table
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    {menus.length} menus × {components.length} components
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
                                Menu ↓ / Component →
                            </th>
                            {components.map(([compId, compName]) => (
                                <th
                                    key={compId}
                                    className="px-3 py-2 text-center font-medium border-b border-r whitespace-nowrap"
                                >
                                    {compName}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {menus.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={components.length + 1}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No menus found.
                                </td>
                            </tr>
                        ) : (
                            menus.map((menu) => (
                                <tr key={menu.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="px-3 py-2 font-medium border-r whitespace-nowrap">
                                        <span className="flex items-center gap-1.5">
                                            {menu.color && (
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: menu.color }}
                                                />
                                            )}
                                            {menu.name}
                                        </span>
                                    </td>
                                    {components.map(([compId]) => {
                                        const qty = lookup.get(menu.id)?.get(compId);
                                        return (
                                            <td
                                                key={compId}
                                                className={`px-3 py-2 text-center border-r tabular-nums ${qty ? 'font-medium' : 'text-muted-foreground/40'}`}
                                            >
                                                {qty ?? '–'}
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
