export const REVALIDATE_PATHS = {
    DASHBOARD_PAGE: '/dashboard',
    DASHBOARD_SETTINGS_PAGE: '/dashboard/settings',
    DASHBOARD_INGREDIENTS_PAGE: '/[lang]/dashboard/[restaurant]/ingredients',
    DASHBOARD_COMPONENTS_PAGE: '/[lang]/dashboard/[restaurant]/components',
    DASHBOARD_COMPONENT_DETAIL_PAGE: '/[lang]/dashboard/[restaurant]/components/[id]',
    DASHBOARD_COMPONENT_NEW_PAGE: '/[lang]/dashboard/[restaurant]/components/new',
    DASHBOARD_COMPONENTS_MATRIX_PAGE: '/[lang]/dashboard/[restaurant]/components/matrix',
    DASHBOARD_MENUS_PAGE: '/[lang]/dashboard/[restaurant]/menus',
    DASHBOARD_MENU_DETAIL_PAGE: '/[lang]/dashboard/[restaurant]/menus/[id]',
    DASHBOARD_MENUS_MATRIX_PAGE: '/[lang]/dashboard/[restaurant]/menus/matrix',
    DASHBOARD_KITCHEN_ORDERS_PAGE: '/[lang]/dashboard/[restaurant]/kitchen/orders',
    DASHBOARD_KITCHEN_SUMMARY_PAGE: '/[lang]/dashboard/[restaurant]/kitchen/summary',
} as const

export const buildDashboardMenusPath = (restaurantId: string) => `/dashboard/${restaurantId}/menus`

export const buildDashboardMenusMatrixPath = (restaurantId: string) =>
    `/dashboard/${restaurantId}/menus/matrix`

export const buildDashboardComponentsPath = (restaurantId: string) =>
    `/dashboard/${restaurantId}/components`

export const buildDashboardComponentsMatrixPath = (restaurantId: string) =>
    `/dashboard/${restaurantId}/components/matrix`
