import { getComponents } from '@/lib/queries/components';
import { ComponentMatrixExport } from '@/components/kitchen/component-matrix-export';

export default async function ComponentMatrixPage({
    params,
}: {
    params: Promise<{ restaurant: string }>;
}) {
    const { restaurant } = await params;
    const components = await getComponents(restaurant);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Component Matrix</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Ingredients × Components mapping. Download as CSV to open in Excel.
                    </p>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <ComponentMatrixExport components={components} restaurantId={restaurant} />
            </div>
        </div>
    );
}
