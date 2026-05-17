import { getDistinctCategories, getIngredients } from '@/lib/queries/ingredients';
import { getComponents } from '@/lib/queries/components';
import { getVendors } from '@/lib/queries/vendors';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';
import { requirePagePermission } from '@/lib/auth/server';

export default async function IngredientsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    await requirePagePermission('kitchen', 'kitchen.read');
    const t = await getTranslations('kitchen');
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
