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
import { requirePagePermission } from '@/lib/auth/server';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { buildDashboardMenusPath } from '@/lib/constants/routes';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function MenuDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    const { id } = await params;
    const isNew = id === 'new';
    await requirePagePermission('menus', isNew ? 'menus.create' : 'menus.read');
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
                            {isNew ? t('pages.newMenu') : t('pages.editMenu')}
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
                            <Link href={buildDashboardMenusPath(restaurant)}>
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
