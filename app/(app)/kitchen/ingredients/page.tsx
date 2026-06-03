import { getDistinctCategories, getIngredients } from '@/lib/queries/ingredients';
import { getComponents } from '@/lib/queries/components';
import { getVendors } from '@/lib/queries/vendors';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';
import { getTranslations } from 'next-intl/server';
import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function IngredientsPage({
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
                        <PageTitle>{t('pages.ingredients')}</PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;
    const [ingredients, vendors, categories, components] = await Promise.all([
        getIngredients(),
        getVendors(),
        getDistinctCategories(),
        getComponents(restaurant),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('pages.ingredients')}</PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <IngredientsTable
                    initialData={ingredients}
                    vendors={vendors}
                    initialCategories={categories}
                    components={components}
                    restaurantId={restaurant}
                />
            </PageContent>
        </Page>
    );
}
