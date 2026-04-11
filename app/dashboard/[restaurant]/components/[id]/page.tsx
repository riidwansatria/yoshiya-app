import { getComponentById } from '@/lib/queries/components';
import { getIngredients } from '@/lib/queries/ingredients';
import { ComponentForm } from '@/components/kitchen/component-form';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent } from '@/components/layout/page';

export default async function ComponentDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const isNew = id === 'new';
    const t = await getTranslations('kitchen');

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
