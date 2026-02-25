'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Printer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AggregatedIngredient } from '@/lib/queries/ingredients-summary';

export function SummaryPrintView({
    restaurantId,
    targetDate,
    groupedIngredients,
}: {
    restaurantId: string;
    targetDate: string;
    groupedIngredients: Record<string, AggregatedIngredient[]>;
}) {
    const router = useRouter();
    const [dateStr, setDateStr] = useState(targetDate);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDate = e.target.value;
        setDateStr(newDate);
        router.push(`/dashboard/${restaurantId}/kitchen/summary?date=${newDate}`);
    };

    const handlePrint = () => {
        window.print();
    };

    const categories = Object.keys(groupedIngredients).sort();
    const hasData = categories.length > 0;

    return (
        <div className="space-y-6">
            {/* Controls - Hidden when printing */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4 print:hidden">
                <div className="flex items-center gap-4">
                    <label className="font-semibold whitespace-nowrap">Target Date:</label>
                    <Input
                        type="date"
                        value={dateStr}
                        onChange={handleDateChange}
                        className="w-auto"
                    />
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={!hasData}>
                    <Printer className="mr-2 h-4 w-4" /> Print Summary
                </Button>
            </div>

            {/* Print Document Header */}
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold">Daily Ingredients Summary</h1>
                <p className="text-lg text-muted-foreground">
                    {format(parseISO(dateStr), 'EEEE, MMMM do, yyyy')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">Generated: {format(new Date(), 'PPpp')}</p>
            </div>

            {!hasData ? (
                <div className="text-center p-12 border border-dashed rounded-md bg-muted/20 print:hidden">
                    <p className="text-lg text-muted-foreground">No ingredients needed for this date.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        Ensure daily orders are entered and mapped to menus with ingredients.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:grid-cols-2 print:gap-12">
                    {categories.map(category => (
                        <div key={category} className="space-y-3 break-inside-avoid">
                            <h3 className="font-bold text-lg border-b pb-1 uppercase tracking-wider text-muted-foreground">
                                {category}
                            </h3>
                            <table className="w-full text-sm">
                                <tbody>
                                    {groupedIngredients[category].map(item => (
                                        <tr key={item.ingredient_id} className="border-b border-muted/50 last:border-0 hover:bg-muted/30">
                                            <td className="py-2 pr-4 font-medium">{item.name}</td>
                                            <td className="py-2 text-right tabular-nums font-semibold w-24">
                                                {item.total_quantity}
                                            </td>
                                            <td className="py-2 pl-2 text-muted-foreground w-16">
                                                {item.unit}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
