import { createCacheClient } from '@/lib/supabase/cache'
import { fetchMenus } from '@/lib/queries/kitchen'
import { getMenuTags } from '@/lib/queries/menu-tags'
import { MenuFinderClient } from '@/components/embed/menu-finder-client'

export default async function EmbedMenuFinderPage({
    params,
}: {
    params: Promise<{ restaurant: string }>
}) {
    const { restaurant } = await params

    const [allMenus, allTags] = await Promise.all([
        fetchMenus(createCacheClient(), restaurant, { includeTags: true }),
        getMenuTags(),
    ])

    const menus = allMenus.filter(m => m.is_public)

    return (
        <div className="p-4">
            <MenuFinderClient menus={menus} allTags={allTags} />
        </div>
    )
}
