import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function check() {
    console.log('Checking users table schema...')

    // Try to select the new columns
    const { data, error } = await supabase
        .from('users')
        .select('id, name, is_assignable, deleted_at')
        .limit(1)

    if (error) {
        console.error('❌ Error querying users table (likely missing columns or migration not run):')
        console.error(JSON.stringify(error, null, 2))
    } else {
        console.log('✅ Successfully queried columns. Schema matches.')
        console.log('Sample data:', data)
    }

    // Check if RLS allows simple update (service role bypasses RLS, so this only checks schema)
    // To check RLS, we'd need a non-service client.
    // But failures are likely due to RLS if schema is correct.

    console.log('\nChecking active users filter...')
    const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .is('deleted_at', null)

    if (countError) {
        console.error('❌ Error filtering by deleted_at:', countError.message)
    } else {
        console.log(`✅ Found ${count} active users.`)
    }
}

check()
