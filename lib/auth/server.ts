import 'server-only';

import type { User } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

import {
    canAccess,
    isAdminRole,
    isAppModule,
    isAppRole,
    isPermission,
    type AppModule,
    type AppRole,
    type Permission,
    type UserAccess,
} from '@/lib/auth/access-control';
import { createClient } from '@/lib/supabase/server';

type UserProfile = {
    id: string;
    name: string;
    role: AppRole;
    deleted_at: string | null;
};

export type CurrentUserAccess = UserAccess & {
    user: User;
    profile: UserProfile;
};

export class AuthorizationError extends Error {
    constructor(message = 'Unauthorized') {
        super(message);
        this.name = 'AuthorizationError';
    }
}

export function isAuthorizationError(error: unknown): error is AuthorizationError {
    return error instanceof AuthorizationError;
}

export function unauthorizedResult(error: unknown) {
    if (isAuthorizationError(error)) {
        return { error: 'Unauthorized' };
    }
    return null;
}

export async function getCurrentUserAccess(): Promise<CurrentUserAccess | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from('users')
        .select('id, name, role, deleted_at')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

    if (!profile || !isAppRole(profile.role)) return null;

    const [{ data: modules }, { data: permissions }] = await Promise.all([
        supabase.from('user_modules').select('module').eq('user_id', user.id),
        supabase.from('role_permissions').select('permission').eq('role', profile.role),
    ]);

    return {
        user,
        profile: profile as UserProfile,
        role: profile.role,
        modules: (modules ?? [])
            .map((row) => row.module)
            .filter(isAppModule),
        permissions: (permissions ?? [])
            .map((row) => row.permission)
            .filter(isPermission),
    };
}

export async function requirePermission(module: AppModule, permission: Permission) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('can_access', {
        required_module: module,
        required_permission: permission,
    });

    if (error || !data) {
        throw new AuthorizationError();
    }
}

export async function requirePagePermission(module: AppModule, permission: Permission) {
    try {
        await requirePermission(module, permission);
    } catch (error) {
        if (isAuthorizationError(error)) {
            notFound();
        }
        throw error;
    }
}

export async function requireAdminRole() {
    const access = await getCurrentUserAccess();
    if (!isAdminRole(access)) {
        throw new AuthorizationError();
    }
    return access;
}

export async function requireAdminPage() {
    try {
        return await requireAdminRole();
    } catch (error) {
        if (isAuthorizationError(error)) {
            notFound();
        }
        throw error;
    }
}

export function hasPermission(
    access: UserAccess | null | undefined,
    module: AppModule,
    permission: Permission
) {
    return canAccess(access, module, permission);
}
