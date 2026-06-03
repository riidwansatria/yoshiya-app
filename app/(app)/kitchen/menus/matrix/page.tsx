import { getMenus } from '@/lib/queries/menus';
import { MenuMatrixExport } from '@/components/kitchen/menu-matrix-export';
import { Page, PageContent, PageDescription, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function MenuMatrixPage({
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

    if (!selectedRestaurant) {
        return (
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>Menu Matrix</PageTitle>
                        <PageDescription>
                            Components × Menus mapping. Download as CSV to open in Excel.
                        </PageDescription>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;
    const menus = await getMenus(restaurant, {
        includeMenuComponents: true,
        includeComponentDetails: true,
    });

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Menu Matrix</PageTitle>
                    <PageDescription>
                        Components × Menus mapping. Download as CSV to open in Excel.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <MenuMatrixExport menus={menus} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
