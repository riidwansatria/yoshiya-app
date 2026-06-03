import { getMenus } from '@/lib/queries/menus';
import { getDailyOrders } from '@/lib/queries/daily-orders';
import { DailyOrdersForm } from '@/components/kitchen/daily-orders-form';
import { format } from 'date-fns';
import { getTranslations } from 'next-intl/server';
import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function DailyOrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ date?: string; restaurant?: string | string[] }>;
}) {
    await requirePagePermission('kitchen', 'kitchen.read');
    const [resolvedSearchParams, restaurants] = await Promise.all([
        searchParams,
        getRestaurants(),
    ]);
    const selectedRestaurant = resolveRestaurantContext(restaurants, resolvedSearchParams.restaurant);
    const t = await getTranslations('kitchen.orders');

    // Default to today if no date provided
    const targetDate = resolvedSearchParams.date || format(new Date(), 'yyyy-MM-dd');

    if (!selectedRestaurant) {
        return (
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>{t('title')}</PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;

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
