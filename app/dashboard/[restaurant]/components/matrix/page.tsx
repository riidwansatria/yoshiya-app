import { getComponents } from '@/lib/queries/components';
import { ComponentMatrixExport } from '@/components/kitchen/component-matrix-export';
import { Page, PageHeader, PageHeaderHeading, PageTitle, PageDescription, PageContent } from '@/components/layout/page';

export default async function ComponentMatrixPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const components = await getComponents(restaurant);

    return (
        <Page>
            <PageHeader>
                <PageHeaderHeading>
                    <PageTitle>Component Matrix</PageTitle>
                    <PageDescription>
                        Ingredients × Components mapping. Download as CSV to open in Excel.
                    </PageDescription>
                </PageHeaderHeading>
            </PageHeader>
            <PageContent>
                <ComponentMatrixExport components={components} restaurantId={restaurant} />
            </PageContent>
        </Page>
    );
}
