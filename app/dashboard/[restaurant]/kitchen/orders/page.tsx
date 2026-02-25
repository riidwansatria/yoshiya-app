import { getMenus } from '@/lib/queries/menus';
import { getDailyOrders } from '@/lib/queries/daily-orders';
import { DailyOrdersForm } from '@/components/kitchen/daily-orders-form';
import { format } from 'date-fns';

export default async function DailyOrdersPage({
    params,
    searchParams,
}: {
    params: Promise<{ restaurant: string }>;
    searchParams: Promise<{ date?: string }>;
}) {
    const { restaurant } = await params;
    const resolvedSearchParams = await searchParams;

    // Default to today if no date provided
    const targetDate = resolvedSearchParams.date || format(new Date(), 'yyyy-MM-dd');

    const [menus, existingOrders] = await Promise.all([
        getMenus(restaurant),
        getDailyOrders(restaurant, targetDate),
    ]);

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Daily Orders Input</h2>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <DailyOrdersForm
                    restaurantId={restaurant}
                    targetDate={targetDate}
                    availableMenus={menus}
                    initialOrders={existingOrders}
                />
            </div>
        </div>
    );
}
