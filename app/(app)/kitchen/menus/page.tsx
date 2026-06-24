import { getMenus } from '@/lib/queries/menus';
import { getMenuTags } from '@/lib/queries/menu-tags';
import { MenusList } from '@/components/kitchen/menus-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';
import {
    buildDashboardMenuDetailPath,
} from '@/lib/constants/routes';

export default async function MenusPage({
    searchParams,
}: {
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    await requirePagePermission('menus', 'menus.read');
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
                        <PageTitle>{t('pages.menus')}</PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;
    const [menus, availableTags] = await Promise.all([
        getMenus(restaurant, {
            includeMenuComponents: true,
            includeComponentDetails: true,
            includeTags: true,
        }),
        getMenuTags(),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('pages.menus')}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <Button asChild>
                        <Link href={buildDashboardMenuDetailPath('new', restaurant)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('pages.newMenuButton')}
                        </Link>
                    </Button>
                </PageActions>
            </PageHeader>
            <PageContent>
                <MenusList
                    initialData={menus}
                    availableTags={availableTags}
                    restaurantId={restaurant}
                />
            </PageContent>
        </Page>
    );
}
