import { getIngredientsSummary } from '@/lib/queries/ingredients-summary';
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

    const groupedIngredients = await getIngredientsSummary(restaurant, targetDate);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Ingredients Summary</h2>
            </div>
            <div className="h-full flex-1 flex-col space-y-8 md:flex">
                <SummaryPrintView
                    restaurantId={restaurant}
                    targetDate={targetDate}
                    groupedIngredients={groupedIngredients}
                />
            </div>
        </div>
    );
}
