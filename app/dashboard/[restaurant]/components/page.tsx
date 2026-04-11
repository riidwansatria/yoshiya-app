import { getComponents } from '@/lib/queries/components';
import { getMenus } from '@/lib/queries/menus';
import { ComponentsList } from '@/components/kitchen/components-list';
import { Button } from '@/components/ui/button';
import { PlusCircle, LayoutList } from 'lucide-react';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page';

export default async function ComponentsPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const t = await getTranslations('kitchen');
    const [components, menus] = await Promise.all([
        getComponents(restaurant),
        getMenus(restaurant, { includeMenuComponents: true, includeComponentDetails: true }),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('pages.components')}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/${restaurant}/components/matrix`}>
                            <LayoutList className="mr-2 h-4 w-4" />
                            {t('pages.matrixExport')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dashboard/${restaurant}/components/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('pages.newComponentButton')}
                        </Link>
                    </Button>
                </PageActions>
            </PageHeader>
            <PageContent>
                <ComponentsList initialData={components} menus={menus} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
