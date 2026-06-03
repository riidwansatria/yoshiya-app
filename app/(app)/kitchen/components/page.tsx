import { getComponents } from '@/lib/queries/components';
import { getMenus } from '@/lib/queries/menus';
import { ComponentsList } from '@/components/kitchen/components-list';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';
import {
    buildDashboardComponentDetailPath,
    buildDashboardComponentsMatrixPath,
} from '@/lib/constants/routes';

export default async function ComponentsPage({
    searchParams,
}: {
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    await requirePagePermission('kitchen', 'kitchen.read');
    const [resolvedSearchParams, restaurants] = await Promise.all([
        searchParams,
        getRestaurants(),
    ]);
    const selectedRestaurant = resolveRestaurantContext(restaurants, resolvedSearchParams.restaurant);
    const t = await getTranslations('kitchen');

    if (!selectedRestaurant) {
        return (
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>{t('pages.components')}</PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;
    const [components, menus] = await Promise.all([
        getComponents(restaurant),
        getMenus(restaurant, { includeMenuComponents: true, includeComponentDetails: true }),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('pages.components')}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <Button variant="outline" asChild>
                        <Link href={buildDashboardComponentsMatrixPath(restaurant)}>
                            <LayoutList className="mr-2 h-4 w-4" />
                            {t('pages.matrixExport')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={buildDashboardComponentDetailPath('new', restaurant)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('pages.newComponentButton')}
                        </Link>
                    </Button>
                </PageActions>
            </PageHeader>
            <PageContent>
                <ComponentsList initialData={components} menus={menus} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
