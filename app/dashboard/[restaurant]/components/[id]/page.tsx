import { getComponentById } from '@/lib/queries/components';
import { getIngredients } from '@/lib/queries/ingredients';
import { ComponentForm } from '@/components/kitchen/component-form';
import { notFound } from 'next/navigation';

export default async function ComponentDetailPage({
    params,
}: {
    params: Promise<{ restaurant: string; id: string }>;
}) {
    const { restaurant, id } = await params;
    const isNew = id === 'new';

    const [component, ingredients] = await Promise.all([
        isNew ? null : getComponentById(id),
        getIngredients(),
    ]);

    if (!isNew && !component) {
        notFound();
    }

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 pb-16">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">
                    {isNew ? 'New Component' : 'Edit Component'}
                </h2>
            </div>
            <div className="flex-1 flex-col space-y-8 flex max-w-2xl">
                <ComponentForm
                    initialData={component}
                    availableIngredients={ingredients}
                    restaurantId={restaurant}
                />
            </div>
        </div>
    );
}
