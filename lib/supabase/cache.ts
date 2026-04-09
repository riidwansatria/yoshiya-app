import { createClient } from '@supabase/supabase-js';

/**
 * Cookieless anon Supabase client for use inside `unstable_cache`.
 *
 * `unstable_cache` functions run outside the request context, so they cannot
 * read cookies or headers. This client skips session/cookie handling and
 * relies on public-read RLS policies for cached reads.
 *
 * Never use this for writes or for data that is user-scoped.
 */
export function createCacheClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}
