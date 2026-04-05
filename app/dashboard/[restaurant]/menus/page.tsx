import { getMenus } from '@/lib/queries/menus';
import { getMenuTags } from '@/lib/queries/menu-tags';
import { MenusList } from '@/components/kitchen/menus-list';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import Link from 'next/link';
import { LayoutList } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

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
        getMenuTags(restaurant),
    ]);

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">{t('pages.menus')}</h2>
                <div className="flex items-center space-x-2">
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
                </div>
            </div>
            <div className="flex-1 min-h-0">
                <MenusList
                    initialData={menus}
                    availableTags={availableTags}
                    restaurantId={restaurant}
                />
            </div>
        </div>
    );
}
