'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AggregatedIngredient } from '@/lib/queries/ingredients-summary';
import { AggregatedComponent } from '@/lib/queries/components-summary';

export function SummaryPrintView({
    restaurantId,
    targetDate,
    groupedIngredients,
    components,
}: {
    restaurantId: string;
    targetDate: string;
    groupedIngredients: Record<string, AggregatedIngredient[]>;
    components: AggregatedComponent[];
}) {
    const router = useRouter();
    const [dateStr, setDateStr] = useState(targetDate);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDateStr(newDate);
        router.push(`/dashboard/${restaurantId}/kitchen/summary?date=${newDate}`);
    };

    const handlePrint = () => window.print();

    const categories = Object.keys(groupedIngredients).sort();
    const hasIngredients = categories.length > 0;
    const hasComponents = components.length > 0;

    return (
        <div className="flex flex-col h-full space-y-4">
            {/* Controls — hidden when printing */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4 print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <label className="font-semibold whitespace-nowrap">Target Date:</label>
                    <Input
                        type="date"
                        value={dateStr}
                        onChange={handleDateChange}
                        className="w-auto"
                    />
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={!hasIngredients && !hasComponents}>
                    <Printer className="mr-2 h-4 w-4" /> Print Summary
                </Button>
            </div>

            {/* Print header */}
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold">Daily Kitchen Summary</h1>
                <p className="text-lg text-muted-foreground">{format(parseISO(dateStr), 'EEEE, MMMM do, yyyy')}</p>
                <p className="text-sm text-muted-foreground mt-1">Generated: {format(new Date(), 'PPpp')}</p>
            </div>

            <Tabs defaultValue="ingredients" className="flex-1 min-h-0 flex flex-col print:hidden">
                <TabsList>
                    <TabsTrigger value="ingredients">Ingredients</TabsTrigger>
                    <TabsTrigger value="components">Components</TabsTrigger>
                </TabsList>

                {/* ─── Ingredients tab ─── */}
                <TabsContent value="ingredients" className="flex-1 min-h-0 overflow-y-auto mt-4">
                    {!hasIngredients ? (
                        <div className="text-center p-12 border border-dashed rounded-md bg-muted/20">
                            <p className="text-lg text-muted-foreground">No ingredients needed for this date.</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Ensure daily orders are entered and mapped to menus with ingredients.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {categories.map((category) => (
                                <div key={category} className="space-y-3 break-inside-avoid">
                                    <h3 className="font-bold text-lg border-b pb-1 uppercase tracking-wider text-muted-foreground">
                                        {category}
                                    </h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {groupedIngredients[category].map((item) => (
                                                <tr key={item.ingredient_id} className="border-b border-muted/50 last:border-0 hover:bg-muted/30">
                                                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                                                    <td className="py-2 text-right tabular-nums font-semibold w-24">{item.total_quantity}</td>
                                                    <td className="py-2 pl-2 text-muted-foreground w-16">{item.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* ─── Components tab ─── */}
                <TabsContent value="components" className="flex-1 min-h-0 overflow-y-auto mt-4">
                    {!hasComponents ? (
                        <div className="text-center p-12 border border-dashed rounded-md bg-muted/20">
                            <p className="text-lg text-muted-foreground">No components needed for this date.</p>
                            <p className="text-sm text-muted-foreground mt-2">
                                Ensure daily orders are entered and menus have components mapped.
                            </p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <table className="w-full text-sm">
                                <thead className="bg-background sticky top-0 z-10">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium border-b">Component</th>
                                        <th className="px-3 py-2 text-right font-medium border-b w-32">Total Qty</th>
                                        <th className="px-3 py-2 text-left font-medium border-b w-32 text-muted-foreground">Yield / batch</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {components.map((comp) => (
                                        <tr key={comp.component_id} className="border-b last:border-0 hover:bg-muted/30">
                                            <td className="px-3 py-2 font-medium">
                                                {comp.name}
                                                {comp.description && (
                                                    <span className="block text-xs text-muted-foreground font-normal">{comp.description}</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right tabular-nums font-semibold">{comp.total_quantity}</td>
                                            <td className="px-3 py-2 text-muted-foreground text-xs">{comp.yield_servings} servings</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* Print view — show both tables without tabs */}
            <div className="hidden print:block space-y-10">
                {hasIngredients && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">Ingredients</h2>
                        <div className="grid grid-cols-2 gap-12">
                            {categories.map((category) => (
                                <div key={category} className="space-y-3 break-inside-avoid">
                                    <h3 className="font-bold text-base border-b pb-1 uppercase tracking-wider text-muted-foreground">{category}</h3>
                                    <table className="w-full text-sm">
                                        <tbody>
                                            {groupedIngredients[category].map((item) => (
                                                <tr key={item.ingredient_id} className="border-b border-muted/30 last:border-0">
                                                    <td className="py-1.5 pr-4">{item.name}</td>
                                                    <td className="py-1.5 text-right tabular-nums font-semibold w-20">{item.total_quantity}</td>
                                                    <td className="py-1.5 pl-2 text-muted-foreground w-14">{item.unit}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {hasComponents && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">Components</h2>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="py-1.5 pr-4 text-left font-semibold">Component</th>
                                    <th className="py-1.5 text-right font-semibold w-24">Total Qty</th>
                                    <th className="py-1.5 pl-2 text-left font-normal text-muted-foreground w-28">Yield / batch</th>
                                </tr>
                            </thead>
                            <tbody>
                                {components.map((comp) => (
                                    <tr key={comp.component_id} className="border-b last:border-0">
                                        <td className="py-1.5 pr-4">{comp.name}</td>
                                        <td className="py-1.5 text-right tabular-nums font-semibold">{comp.total_quantity}</td>
                                        <td className="py-1.5 pl-2 text-muted-foreground text-xs">{comp.yield_servings} servings</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
