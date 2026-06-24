import { getComponents } from '@/lib/queries/components';
import { getIngredients } from '@/lib/queries/ingredients';
import { ComponentMatrixExport } from '@/components/kitchen/component-matrix-export';
import { Page, PageContent, PageDescription, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requireAdminPage } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function ComponentMatrixPage({
    searchParams,
}: {
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    await requireAdminPage();
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
                        <PageTitle>Component Ingredient Matrix — Spreadsheet Editing</PageTitle>
                        <PageDescription>
                            Manual spreadsheet workflow for editing component recipes.
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
    const [components, ingredients] = await Promise.all([
        getComponents(restaurant),
        getIngredients(),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Component Ingredient Matrix — Spreadsheet Editing</PageTitle>
                    <PageDescription>
                        Manual spreadsheet workflow for editing component recipes.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <ComponentMatrixExport
                    components={components}
                    ingredients={ingredients}
                    restaurantId={restaurant}
                    restaurantName={selectedRestaurant.name}
                />
            </PageContent>
        </Page>
    );
}
