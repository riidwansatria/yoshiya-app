import { getMenuById } from '@/lib/queries/menus';
import { getComponentOptions } from '@/lib/queries/components';
import { getMenuTags } from '@/lib/queries/menu-tags';
import { MenuForm } from '@/components/kitchen/menu-form';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageContent, PageFooter, PageActions } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MenuFormProvider, MenuFormSubmitButton } from '@/components/kitchen/menu-form-context';

export default async function MenuDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const isNew = id === 'new';
    const t = await getTranslations('kitchen');

    const [menu, components, availableTags] = await Promise.all([
        isNew ? null : getMenuById(id),
        getComponentOptions(restaurant),
        getMenuTags(),
    ]);

    if (!isNew && !menu) {
        notFound();
    }

    return (
        <MenuFormProvider>
            <Page>
                <PageHeader>
                    <PageHeaderHeading>
                        <PageTitle>
                            {isNew ? t('pages.newMenu') : t('pages.editMenu')}
                        </PageTitle>
                    </PageHeaderHeading>
                    <PageActions>
                        <div id="menu-status-slot" />
                    </PageActions>
                </PageHeader>
                <PageContent>
                    <MenuForm
                        initialData={menu}
                        availableComponents={components}
                        availableTags={availableTags}
                        restaurantId={restaurant}
                    />
                </PageContent>
                <PageFooter>
                    <PageActions>
                        <Button asChild variant="outline" size="sm">
                            <Link href={`/dashboard/${restaurant}/menus`}>
                                {t('common.cancel')}
                            </Link>
                        </Button>
                        <MenuFormSubmitButton>
                            {t('menus.form.save')}
                        </MenuFormSubmitButton>
                    </PageActions>
                </PageFooter>
            </Page>
        </MenuFormProvider>
    );
}
