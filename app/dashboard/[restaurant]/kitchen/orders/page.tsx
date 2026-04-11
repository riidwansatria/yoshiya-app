import { getMenus } from '@/lib/queries/menus';
import { getDailyOrders } from '@/lib/queries/daily-orders';
import { DailyOrdersForm } from '@/components/kitchen/daily-orders-form';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';

export default async function DailyOrdersPage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>;
    searchParams: Promise<{ date?: string }>;
}) {
    const { restaurant } = await params;
    const resolvedSearchParams = await searchParams;
    const t = await getTranslations('kitchen.orders');

    // Default to today if no date provided
    const targetDate = resolvedSearchParams.date || format(new Date(), 'yyyy-MM-dd');

    const [menus, existingOrders] = await Promise.all([
        getMenus(restaurant),
        getDailyOrders(restaurant, targetDate),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('title')}</PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                    <DailyOrdersForm
                        restaurantId={restaurant}
                        targetDate={targetDate}
                        availableMenus={menus}
                        initialOrders={existingOrders}
                    />
                </div>
            </PageContent>
        </Page>
    );
}
