import { getComponents } from '@/lib/queries/components';
import { ComponentMatrixExport } from '@/components/kitchen/component-matrix-export';
import { Page, PageContent, PageDescription, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function ComponentMatrixPage({
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

    if (!selectedRestaurant) {
        return (
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>Component Matrix</PageTitle>
                        <PageDescription>
                            Ingredients × Components mapping. Download as CSV to open in Excel.
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
    const components = await getComponents(restaurant);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Component Matrix</PageTitle>
                    <PageDescription>
                        Ingredients × Components mapping. Download as CSV to open in Excel.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <ComponentMatrixExport components={components} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
