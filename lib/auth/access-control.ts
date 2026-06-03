export const ROLES = ['admin', 'owner', 'manager', 'staff'] as const;
export type AppRole = (typeof ROLES)[number];

export const MODULES = [
    'reservations',
    'kitchen',
    'procurement',
    'skewer_shop',
    'menus',
    'reports',
    'staff_management',
    'settings',
] as const;
export type AppModule = (typeof MODULES)[number];

export const PERMISSIONS = [
    'reservations.read',
    'reservations.create',
    'reservations.update',
    'reservations.delete',
    'kitchen.read',
    'kitchen.update',
    'procurement.read',
    'procurement.create',
    'procurement.update',
    'procurement.delete',
    'skewer_shop.read',
    'skewer_shop.update',
    'menus.read',
    'menus.create',
    'menus.update',
    'menus.delete',
    'reports.read',
    'financials.read',
    'staff.read',
    'staff.manage',
    'settings.read',
    'settings.manage',
    'permissions.manage',
    'system.manage',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export type UserAccess = {
    role: AppRole;
    modules: AppModule[];
    permissions: Permission[];
};

const ROLE_SET = new Set<string>(ROLES);
const MODULE_SET = new Set<string>(MODULES);
const PERMISSION_SET = new Set<string>(PERMISSIONS);

export function isAppRole(value: string | null | undefined): value is AppRole {
    return Boolean(value && ROLE_SET.has(value));
}

export function isAppModule(value: string | null | undefined): value is AppModule {
    return Boolean(value && MODULE_SET.has(value));
}

export function isPermission(value: string | null | undefined): value is Permission {
    return Boolean(value && PERMISSION_SET.has(value));
}

export function canAccess(
    access: UserAccess | null | undefined,
    module: AppModule,
    permission: Permission
) {
    if (!access) return false;
    if (!access.permissions.includes(permission)) return false;
    return access.role === 'admin' || access.role === 'owner' || access.modules.includes(module);
}

export function canAccessAny(
    access: UserAccess | null | undefined,
    requirements: Array<{ module: AppModule; permission: Permission }>
) {
    return requirements.some(({ module, permission }) => canAccess(access, module, permission));
}

export function getDefaultDashboardPath(
    access: UserAccess | null | undefined,
    restaurantId = 'enkaijou'
) {
    if (canAccess(access, 'reservations', 'reservations.read')) {
        return `/reservations/${restaurantId}/schedule`;
    }
    if (canAccess(access, 'kitchen', 'kitchen.read')) {
        return `/kitchen/orders`;
    }
    if (canAccess(access, 'menus', 'menus.read')) {
        return `/kitchen/menus`;
    }
    if (canAccess(access, 'procurement', 'procurement.read')) {
        return `/procurement/purchase-orders`;
    }
    return '/';
}
