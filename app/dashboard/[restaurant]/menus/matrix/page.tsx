import { getMenus } from '@/lib/queries/menus';
import { MenuMatrixExport } from '@/components/kitchen/menu-matrix-export';

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
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Menu Matrix</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Components × Menus mapping. Download as CSV to open in Excel.
                    </p>
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <MenuMatrixExport menus={menus} restaurantId={restaurant} />
            </div>
        </div>
    );
}
