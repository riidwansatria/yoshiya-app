import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars')
    process.exit(1)
}

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Circled numbers ①–⑳ (U+2460–U+2473) and ㉑–㉟ (U+3251–U+325F)
const CIRCLED = [
    ...Array.from({ length: 20 }, (_, i) => String.fromCodePoint(0x2460 + i)), // ①–⑳
    ...Array.from({ length: 15 }, (_, i) => String.fromCodePoint(0x3251 + i)), // ㉑–㉟
]

function extractNumber(name: string): number | null {
    for (let i = 0; i < CIRCLED.length; i++) {
        if (name.startsWith(CIRCLED[i])) return i + 1
    }
    return null
}

function replaceNumber(name: string, n: number): string {
    for (const c of CIRCLED) {
        if (name.startsWith(c)) return CIRCLED[n - 1] + name.slice(c.length)
    }
    return name
}

const DRY_RUN = process.argv[2] !== '--apply'

async function main() {
    const { data: menus, error } = await supabase
        .from('menus')
        .select('id, name')
        .order('name')

    if (error) { console.error(error); process.exit(1) }

    const numbered = menus!
        .map(m => ({ ...m, n: extractNumber(m.name) }))
        .filter(m => m.n !== null)
        .sort((a, b) => {
            // Sort by the non-number part first, then by number
            const aRest = a.name.slice(CIRCLED[a.n! - 1].length)
            const bRest = b.name.slice(CIRCLED[b.n! - 1].length)
            if (aRest !== bRest) return aRest.localeCompare(bRest, 'ja')
            return a.n! - b.n!
        })

    // Re-sequence within each group that shares the same base name pattern
    // If all names are in one sequence, just sort by current number
    const sorted = [...numbered].sort((a, b) => a.n! - b.n!)

    console.log(DRY_RUN ? '[DRY RUN] Changes to apply:' : '[APPLY] Updating...')
    console.log()

    for (let i = 0; i < sorted.length; i++) {
        const menu = sorted[i]
        const newN = i + 1
        if (menu.n === newN) {
            console.log(`  (unchanged) ${menu.name}`)
            continue
        }
        const newName = replaceNumber(menu.name, newN)
        console.log(`  ${menu.name}  →  ${newName}`)

        if (!DRY_RUN) {
            const { error } = await supabase
                .from('menus')
                .update({ name: newName })
                .eq('id', menu.id)
            if (error) console.error(`    ERROR: ${error.message}`)
        }
    }

    console.log()
    console.log(DRY_RUN ? 'Run with --apply to commit changes.' : 'Done.')
}

main()
