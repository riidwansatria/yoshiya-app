import { getMenus } from '@/lib/queries/menus';
import { getMenuTags } from '@/lib/queries/menu-tags';
import { MenusList } from '@/components/kitchen/menus-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { LayoutList } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageActions, PageContent } from '@/components/layout/page';

export default async function MenusPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const t = await getTranslations('kitchen');
    const [menus, availableTags] = await Promise.all([
        getMenus(restaurant, {
            includeMenuComponents: true,
            includeComponentDetails: true,
            includeTags: true,
        }),
        getMenuTags(),
    ]);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>{t('pages.menus')}</PageTitle>
                </PageHeaderHeading>
                <PageActions>
                    <Button variant="outline" asChild>
                        <Link href={`/dashboard/${restaurant}/menus/matrix`}>
                            <LayoutList className="mr-2 h-4 w-4" />
                            {t('pages.matrixExport')}
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href={`/dashboard/${restaurant}/menus/new`}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            {t('pages.newMenuButton')}
                        </Link>
                    </Button>
                </PageActions>
            </PageHeader>
            <PageContent>
                <MenusList
                    initialData={menus}
                    availableTags={availableTags}
                    restaurantId={restaurant}
                />
            </PageContent>
        </Page>
    );
}
