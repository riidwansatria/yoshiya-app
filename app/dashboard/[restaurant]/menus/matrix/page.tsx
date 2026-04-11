import { getMenus } from '@/lib/queries/menus';
import { MenuMatrixExport } from '@/components/kitchen/menu-matrix-export';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageDescription, PageContent } from '@/components/layout/page';

export default async function MenuMatrixPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const menus = await getMenus(restaurant, {
        includeMenuComponents: true,
        includeComponentDetails: true,
    });

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Menu Matrix</PageTitle>
                    <PageDescription>
                        Components × Menus mapping. Download as CSV to open in Excel.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <MenuMatrixExport menus={menus} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
