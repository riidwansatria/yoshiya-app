import { getIngredients } from '@/lib/queries/ingredients';
import { IngredientsTable } from '@/components/kitchen/ingredients-table';

export default async function IngredientsPage() {
    const ingredients = await getIngredients();

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Ingredients</h2>
            </div>
            <div className="hidden h-full flex-1 flex-col space-y-8 md:flex">
                <IngredientsTable initialData={ingredients} />
            </div>
        </div>
    );
}
