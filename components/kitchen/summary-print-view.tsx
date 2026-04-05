'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ja, enUS } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    const t = useTranslations('kitchen.summary');
    const locale = useLocale();
    const dateLocale = locale === 'ja' ? ja : enUS;
    const longDateFormat = locale === 'ja' ? 'yyyy年M月d日 (EEE)' : 'EEEE, MMMM do, yyyy';
    const generatedFormat = locale === 'ja' ? 'yyyy/MM/dd HH:mm' : 'PPpp';
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
    const isUncategorized = (category: string) => category.trim().toLowerCase() === 'uncategorized';

    const ingredientsByCategory = (
        <div className="space-y-6 print:space-y-8">
            {categories.map((category) => (
                <div key={category} className="space-y-2 break-inside-avoid print:break-inside-auto">
                    {!isUncategorized(category) && (
                        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground px-1">
                            {category}
                        </h3>
                    )}
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('ingredientColumn')}</TableHead>
                                    <TableHead className="text-right w-20">{t('needColumn')}</TableHead>
                                    <TableHead className="text-right w-14">{t('orderColumn')}</TableHead>
                                    <TableHead className="pl-2">{t('packColumn')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedIngredients[category].map((item) => {
                                    const hasPack = item.packages_needed !== null && item.package_size != null;
                                    return (
                                        <TableRow key={item.ingredient_id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell className="text-right tabular-nums text-muted-foreground">
                                                {item.total_quantity} {item.unit}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums font-bold">
                                                {hasPack ? item.packages_needed : '—'}
                                            </TableCell>
                                            <TableCell className="pl-2 text-xs text-muted-foreground">
                                                {hasPack ? (
                                                    <>× {item.package_size}{item.unit} {item.package_label?.trim() || t('defaultPackLabel')}</>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ))}
        </div>
    );

    const componentsTable = (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t('componentColumn')}</TableHead>
                        <TableHead className="text-right w-32">{t('totalQtyColumn')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {components.map((comp) => (
                        <TableRow key={comp.component_id}>
                            <TableCell className="font-medium">
                                {comp.name}
                                {comp.description && (
                                    <span className="block text-xs text-muted-foreground font-normal">
                                        {comp.description}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">
                                {comp.total_quantity}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="flex flex-col h-full space-y-4 print:h-auto print:overflow-visible print:block">
            {/* Controls — hidden when printing */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center border-b pb-4 print:hidden shrink-0">
                <div className="flex items-center gap-4">
                    <label className="font-semibold whitespace-nowrap">{t('targetDate')}:</label>
                    <Input
                        type="date"
                        value={dateStr}
                        onChange={handleDateChange}
                        className="w-auto"
                    />
                </div>
                <Button onClick={handlePrint} variant="outline" disabled={!hasIngredients && !hasComponents}>
                    <Printer className="mr-2 h-4 w-4" /> {t('printButton')}
                </Button>
            </div>

            {/* Print header */}
            <div className="hidden print:block text-center mb-8 border-b pb-4">
                <h1 className="text-2xl font-bold">{t('printHeader')}</h1>
                <p className="text-lg text-muted-foreground">{format(parseISO(dateStr), longDateFormat, { locale: dateLocale })}</p>
                <p className="text-sm text-muted-foreground mt-1">{t('generatedAt')}: {format(new Date(), generatedFormat, { locale: dateLocale })}</p>
            </div>

            <Tabs defaultValue="ingredients" className="flex-1 min-h-0 flex flex-col print:hidden">
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
                        ingredientsByCategory
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
                        componentsTable
                    )}
                </TabsContent>
            </Tabs>

            {/* Print view — show both tables without tabs */}
            <div className="hidden print:block space-y-10">
                {hasIngredients && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">{t('ingredientsTab')}</h2>
                        {ingredientsByCategory}
                    </div>
                )}
                {hasComponents && (
                    <div>
                        <h2 className="text-xl font-bold mb-4 border-b pb-2">{t('componentsTab')}</h2>
                        {componentsTable}
                    </div>
                )}
            </div>
        </div>
    );
}
