import type { Restaurant } from '@/lib/queries/restaurants';

export function getFirstSearchParam(value: string | string[] | undefined) {
    if (Array.isArray(value)) return value[0] ?? null;
    return value ?? null;
}

export function resolveRestaurantContext(
    restaurants: Restaurant[],
    restaurantParam: string | string[] | undefined
) {
    const restaurantId = getFirstSearchParam(restaurantParam);
    if (!restaurantId) return null;
    return restaurants.find((restaurant) => restaurant.id === restaurantId) ?? null;
}
