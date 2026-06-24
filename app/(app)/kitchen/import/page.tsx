import { AiImportWorkbench } from '@/components/kitchen/ai-import-workbench';
import {
    Page,
    PageContent,
    PageDescription,
    PageHeader,
    PageHeaderHeading,
    PageTitle,
} from '@/components/layout/page';
import { RestaurantRequiredState } from '@/components/layout/restaurant-context-select';
import { requireAdminPage } from '@/lib/auth/server';
import { getKitchenImportOverview } from '@/lib/queries/kitchen-import';
import { getRestaurants } from '@/lib/queries/restaurants';
import { resolveRestaurantContext } from '@/lib/utils/restaurant-context';

export default async function KitchenImportPage({
    searchParams,
}: {
    searchParams: Promise<{ restaurant?: string | string[] }>;
}) {
    await requireAdminPage();
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
                        <PageTitle>CSV Import</PageTitle>
                        <PageDescription>Choose a restaurant before exporting or importing kitchen data.</PageDescription>
                    </PageHeaderHeading>
                </PageHeader>
                <PageContent>
                    <RestaurantRequiredState restaurants={restaurants} />
                </PageContent>
            </Page>
        );
    }

    const overview = await getKitchenImportOverview(selectedRestaurant.id);
    if (!overview) {
        return null;
    }

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>CSV Import</PageTitle>
                    <PageDescription>
                        Export, edit, validate, review, and apply kitchen data as one transaction.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <AiImportWorkbench
                    overview={overview}
                    applyEnabled={process.env.KITCHEN_IMPORT_APPLY_ENABLED !== 'false'}
                />
            </PageContent>
        </Page>
    );
}
