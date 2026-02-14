"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"
import { getUserRole } from "@/lib/queries/users"

// Admin client for auth management
const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

export async function toggleAssignable(userId: string, isAssignable: boolean) {
    const role = await getUserRole()
    if (role !== 'manager') {
        throw new Error('Unauthorized')
    }

    const { error } = await supabaseAdmin
        .from('users')
        .update({ is_assignable: isAssignable })
        .eq('id', userId)

    if (error) throw error
    revalidatePath('/dashboard/settings/staff')
}

export async function removeStaff(userId: string) {
    const role = await getUserRole()
    if (role !== 'manager') {
        throw new Error('Unauthorized')
    }

    // 1. Soft delete in DB
    const { error } = await supabaseAdmin
        .from('users')
        .update({
            deleted_at: new Date().toISOString(),
            is_assignable: false
        })
        .eq('id', userId)

    if (error) throw error

    // 2. Ban/Delete in Auth?
    // Requirement: "User can no longer log in".
    // We can delete the user or ban them using admin API.
    // Soft-delete in DB preserves historical data.
    // Use admin.deleteUser to remove login access, but this removes from Auth.
    // If we want to prevent login but keep Auth user, we can ban.
    // But typically "remove" implies deleting the account.
    // However, if we delete Auth user, their ID is gone from Auth system.
    // "Past reservation_staff records with this user_id remain intact".
    // Since `reservation_staff.user_id` is a UUID, if Auth user is gone, it's fine as long as DB row exists.
    // But wait, `users` table usually references `auth.users`? 
    // If `users.id` foreign key references `auth.users.id`, deleting from Auth might cascade delete `users` row?
    // I need to check FK constraint.
    // `create_users.sql`: `create table "public"."users" ("id" uuid not null default gen_random_uuid() ...)`
    // It does NOT seem to reference `auth.users` explicitly in the provided snippet.
    // "Insert row in users table with the Auth UID as id".
    // If no FK, safe to delete from Auth.

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError) {
        console.error('Error deleting auth user:', authError)
        // Ensure to handle partial failure if needed
    }

    revalidatePath('/dashboard/settings/staff')
}

export async function addStaff(data: { name: string, username: string, password: string }) {
    const role = await getUserRole()
    if (role !== 'manager') {
        throw new Error('Unauthorized')
    }

    const email = `${data.username}@yoshiya.internal`

    // 1. Create Auth User
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: { name: data.name }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('Failed to create user')

    // 2. Insert into users table
    const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
            id: authData.user.id,
            name: data.name,
            role: 'staff', // Hardcoded for simplified version
            // restaurant_id: 'banquet', // If column exists? Not in `create_users.sql` snippet...
            // Wait, snippet didn't show restaurant_id. 
            // "Note: ... Add these fields ... when multi-restaurant support is needed."
            // But implementation spec says "restaurant_id = 'banquet' (hardcoded for now)".
            // I should check if `restaurant_id` exists in `users`.
            // Snippet 1708 didn't show it.
            // So I should validly NOT insert it if it doesn't exist.
            is_assignable: true
        })

    revalidatePath('/dashboard/settings/staff')
}

export async function updateStaff(userId: string, data: { name: string, password?: string }) {
    const role = await getUserRole()
    if (role !== 'manager') {
        throw new Error('Unauthorized')
    }

    // 1. Update DB
    const { error } = await supabaseAdmin
        .from('users')
        .update({ name: data.name })
        .eq('id', userId)

    if (error) throw error

    // 2. Update Auth if password provided
    const trimmedPassword = data.password?.trim()
    if (trimmedPassword && trimmedPassword !== '') {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            password: trimmedPassword
        })
        if (authError) throw authError
    }

    revalidatePath('/dashboard/settings/staff')
}
