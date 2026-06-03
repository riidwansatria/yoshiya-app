import { getComponentById } from '@/lib/queries/components';
import { getIngredients } from '@/lib/queries/ingredients';
import { ComponentForm } from '@/components/kitchen/component-form';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Page, PageContent, PageHeader, PageHeaderHeading, PageTitle } from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requirePagePermission } from '@/lib/auth/server';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function ComponentDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    const { id } = await params;
    const isNew = id === 'new';
    await requirePagePermission('kitchen', isNew ? 'kitchen.update' : 'kitchen.read');
    const [t, resolvedSearchParams, restaurants] = await Promise.all([
        getTranslations('kitchen'),
        searchParams,
        getRestaurants(),
    ]);
    const selectedRestaurant = resolveRestaurantContext(restaurants, resolvedSearchParams.restaurant);

    if (!selectedRestaurant) {
        return (
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>
                            {isNew ? t('pages.newComponent') : t('pages.editComponent')}
                        </PageTitle>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const restaurant = selectedRestaurant.id;

    const [component, ingredients] = await Promise.all([
        isNew ? null : getComponentById(id),
        getIngredients(),
    ]);

    if (!isNew && !component) {
        notFound();
    }

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>
                        {isNew ? t('pages.newComponent') : t('pages.editComponent')}
                    </PageTitle>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent className="max-w-2xl pb-16">
                <ComponentForm
                    initialData={component}
                    availableIngredients={ingredients}
                    restaurantId={restaurant}
                />
            </PageContent>
        </Page>
    );
}
