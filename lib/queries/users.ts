import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

export const getUsers = cache(async () => {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('is_assignable', true)
        .is('deleted_at', null)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data;
});

export const getUserRole = cache(async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

    if (error) return null;
    return data.role;
});

export const getAllStaff = cache(async () => {
    const supabase = await createClient();

    // Fetch all users including soft-deleted ones? 
    // Requirement says "Active staff" usually, but "Remove" action soft-deletes.
    // "User disappears from staff list". So filter out deleted_at.

    const { data, error } = await supabase
        .from('users')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching staff:', error);
        return [];
    }

    return data;
});
