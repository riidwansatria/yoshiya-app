import { getIngredientsSummary } from '@/lib/queries/ingredients-summary';
import { getComponentsSummary } from '@/lib/queries/components-summary';
import { SummaryPrintView } from '@/components/kitchen/summary-print-view';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';

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
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('title')}</PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <SummaryPrintView
                    restaurantId={restaurant}
                    fromDate={fromDate}
                    toDate={toDate}
                    groupedIngredients={groupedIngredients}
                    components={components}
                />
            </PageContent>
        </Page>
    );
}
