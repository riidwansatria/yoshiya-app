import { createClient } from '@/lib/supabase/server';

export async function getUsers() {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('users')
        .select('id, name, role')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching users:', error);
        return [];
    }

    return data;
}
