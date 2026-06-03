import { notFound } from 'next/navigation';

import { IngredientEditorPage } from '@/components/kitchen/ingredient-editor-page';
import { getDistinctCategories, getIngredientById } from '@/lib/queries/ingredients';
import { getRestaurants } from '@/lib/queries/restaurants';
import { getVendors } from '@/lib/queries/vendors';
import { requirePagePermission } from '@/lib/auth/server';
import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function IngredientDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    const { id } = await params;
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
                        <PageTitle>Ingredient</PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;
    const [ingredient, vendors, categories] = await Promise.all([
        getIngredientById(id),
        getVendors(),
        getDistinctCategories(),
    ]);

    if (!ingredient) {
        notFound();
    }

    return <IngredientEditorPage ingredient={ingredient} vendors={vendors} categories={categories} restaurantId={restaurant} />;
}
