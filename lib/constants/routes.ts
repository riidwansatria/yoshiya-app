export const REVALIDATE_PATHS = {
    DASHBOARD_PAGE: '/',
    DASHBOARD_SETTINGS_PAGE: '/settings',
    DASHBOARD_INGREDIENTS_PAGE: '/[lang]/kitchen/ingredients',
    DASHBOARD_COMPONENTS_PAGE: '/[lang]/kitchen/components',
    DASHBOARD_COMPONENT_DETAIL_PAGE: '/[lang]/kitchen/components/[id]',
    DASHBOARD_COMPONENT_NEW_PAGE: '/[lang]/kitchen/components/new',
    DASHBOARD_COMPONENTS_MATRIX_PAGE: '/[lang]/kitchen/components/matrix',
    DASHBOARD_MENUS_PAGE: '/[lang]/kitchen/menus',
    DASHBOARD_MENU_DETAIL_PAGE: '/[lang]/kitchen/menus/[id]',
    DASHBOARD_MENUS_MATRIX_PAGE: '/[lang]/kitchen/menus/matrix',
    DASHBOARD_KITCHEN_ORDERS_PAGE: '/[lang]/kitchen/orders',
    DASHBOARD_KITCHEN_SUMMARY_PAGE: '/[lang]/kitchen/summary',
    DASHBOARD_KITCHEN_PURCHASE_ORDERS_PAGE: '/[lang]/procurement/purchase-orders',
} as const

function withRestaurantParam(path: string, restaurantId?: string | null) {
    if (!restaurantId) return path
    const separator = path.includes('?') ? '&' : '?'
    return `${path}${separator}restaurant=${encodeURIComponent(restaurantId)}`
}

export const buildDashboardReservationsSchedulePath = (restaurantId: string, date?: string | null) => {
    const path = `/reservations/${restaurantId}/schedule`
    if (!date) return path
    return `${path}?date=${encodeURIComponent(date)}`
}

export const buildDashboardReservationsBookingsPath = (restaurantId: string) =>
    `/reservations/${restaurantId}/bookings`

export const buildDashboardReservationsTodayPath = (restaurantId: string) =>
    `/reservations/${restaurantId}/today`

export const buildDashboardMenusPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/menus', restaurantId)

export const buildDashboardMenusMatrixPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/menus/matrix', restaurantId)

export const buildDashboardMenuDetailPath = (id: string, restaurantId?: string | null) =>
    withRestaurantParam(`/kitchen/menus/${id}`, restaurantId)

export const buildDashboardComponentsPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/components', restaurantId)

export const buildDashboardComponentsMatrixPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/components/matrix', restaurantId)

export const buildDashboardComponentDetailPath = (id: string, restaurantId?: string | null) =>
    withRestaurantParam(`/kitchen/components/${id}`, restaurantId)

export const buildDashboardIngredientsPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/ingredients', restaurantId)

export const buildDashboardIngredientDetailPath = (id: string, restaurantId?: string | null) =>
    withRestaurantParam(`/kitchen/ingredients/${id}`, restaurantId)

export const buildDashboardKitchenOrdersPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/orders', restaurantId)

export const buildDashboardKitchenSummaryPath = (restaurantId?: string | null) =>
    withRestaurantParam('/kitchen/summary', restaurantId)

export const buildDashboardPurchaseOrdersPath = () =>
    '/procurement/purchase-orders'

export const buildDashboardPurchaseOrderDetailPath = (id: string, settingsRestaurantId?: string | null) =>
    withRestaurantParam(`/procurement/purchase-orders/${id}`, settingsRestaurantId)
