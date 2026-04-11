import { getIngredients, getDistinctStores } from '@/lib/queries/ingredients';
import { getComponents } from '@/lib/queries/components';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';

export default async function IngredientsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const t = await getTranslations('kitchen');
    const [ingredients, stores, components] = await Promise.all([
        getIngredients(),
        getDistinctStores(),
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
                    initialStores={stores}
                    components={components}
                    restaurantId={restaurant}
                />
            </PageContent>
        </Page>
    );
}
