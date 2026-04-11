import { getIngredientsSummary } from '@/lib/queries/ingredients-summary';
import { getComponentsSummary } from '@/lib/queries/components-summary';
import { SummaryPrintView } from '@/components/kitchen/summary-print-view';
import { format, isValid, parseISO } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';

function normalizeIsoDate(value: string | undefined, label: 'from' | 'to' | 'date') {
    if (!value) return undefined;
    const parsed = parseISO(value);

    if (!isValid(parsed)) {
        console.error('[IngredientsSummaryPage] Invalid date query param', { label, value });
        return undefined;
    }

    return format(parsed, 'yyyy-MM-dd');
}

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
    const normalizedLegacyDate = normalizeIsoDate(resolvedSearchParams.date, 'date');
    const fromDate = normalizeIsoDate(resolvedSearchParams.from, 'from') || normalizedLegacyDate || today;
    const toDate = normalizeIsoDate(resolvedSearchParams.to, 'to') || normalizedLegacyDate || fromDate;

    let groupedIngredients;
    let components;

    try {
        [groupedIngredients, components] = await Promise.all([
            getIngredientsSummary(restaurant, fromDate, toDate),
            getComponentsSummary(restaurant, fromDate, toDate),
        ]);
    } catch (error) {
        console.error('[IngredientsSummaryPage] Failed to load summary data', {
            restaurant,
            fromDate,
            toDate,
            error,
        });
        throw error;
    }

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
