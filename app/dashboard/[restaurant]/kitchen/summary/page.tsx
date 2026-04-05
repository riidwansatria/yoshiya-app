import { getIngredientsSummary } from '@/lib/queries/ingredients-summary';
import { getComponentsSummary } from '@/lib/queries/components-summary';
import { SummaryPrintView } from '@/components/kitchen/summary-print-view';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';

export default async function IngredientsSummaryPage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>;
    searchParams: Promise<{ date?: string; from?: string; to?: string }>;
}) {
    const { restaurant } = await params;
    const resolvedSearchParams = await searchParams;
    const t = await getTranslations('kitchen.summary');

    // Default to today if no range provided. `date` is the legacy single-day param.
    const today = format(new Date(), 'yyyy-MM-dd');
    const fromDate = resolvedSearchParams.from || resolvedSearchParams.date || today;
    const toDate = resolvedSearchParams.to || resolvedSearchParams.date || fromDate;

    const [groupedIngredients, components] = await Promise.all([
        getIngredientsSummary(restaurant, fromDate, toDate),
        getComponentsSummary(restaurant, fromDate, toDate),
    ]);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6 print:h-auto print:overflow-visible print:block">
            <div className="flex items-center justify-between shrink-0 print:hidden">
                <h2 className="text-3xl font-bold tracking-tight">{t('title')}</h2>
            </div>
            <div className="flex-1 min-h-0 print:h-auto print:overflow-visible print:block">
                <SummaryPrintView
                    restaurantId={restaurant}
                    fromDate={fromDate}
                    toDate={toDate}
                    groupedIngredients={groupedIngredients}
                    components={components}
                />
            </div>
        </div>
    );
}
