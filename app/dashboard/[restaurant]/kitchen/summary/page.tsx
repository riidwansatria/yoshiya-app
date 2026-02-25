import { getIngredientsSummary } from '@/lib/queries/ingredients-summary';
import { getComponentsSummary } from '@/lib/queries/components-summary';
import { SummaryPrintView } from '@/components/kitchen/summary-print-view';
import { format } from 'date-fns';

export default async function IngredientsSummaryPage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>;
    searchParams: Promise<{ date?: string }>;
}) {
    const { restaurant } = await params;
    const resolvedSearchParams = await searchParams;

    // Default to today if no date provided
    const targetDate = resolvedSearchParams.date || format(new Date(), 'yyyy-MM-dd');

    const [groupedIngredients, components] = await Promise.all([
        getIngredientsSummary(restaurant, targetDate),
        getComponentsSummary(restaurant, targetDate),
    ]);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between shrink-0">
                <h2 className="text-3xl font-bold tracking-tight">Kitchen Summary</h2>
            </div>
            <div className="flex-1 min-h-0">
                <SummaryPrintView
                    restaurantId={restaurant}
                    targetDate={targetDate}
                    groupedIngredients={groupedIngredients}
                    components={components}
                />
            </div>
        </div>
    );
}
