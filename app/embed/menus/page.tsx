import { getLocale, getTranslations } from 'next-intl/server'

import {
    MenuFinderClient,
    type EmbedMenuFinderLocale,
    type MenuFinderClientLabels,
} from '@/components/embed/menu-finder-client'
import { fetchMenus } from '@/lib/queries/kitchen'
import { getMenuTags } from '@/lib/queries/menu-tags'
import { createCacheClient } from '@/lib/supabase/cache'

const DEFAULT_EMBED_RESTAURANT = 'banquet'

type EmbedSearchParams = {
    restaurant?: string | string[]
    lang?: string | string[]
}

function getFirstQueryValue(value?: string | string[]) {
    if (Array.isArray(value)) {
        return value[0]
    }

    return value
}

function normalizeLocale(value?: string): EmbedMenuFinderLocale | undefined {
    const normalized = value?.trim().toLowerCase()
    if (!normalized) {
        return undefined
    }

    if (normalized === 'ja' || normalized.startsWith('ja-') || normalized.startsWith('ja_')) {
        return 'ja'
    }

    if (normalized === 'en' || normalized.startsWith('en-') || normalized.startsWith('en_')) {
        return 'en'
    }

    return undefined
}

function normalizeRestaurant(value?: string) {
    const trimmed = value?.trim()
    if (!trimmed) {
        return undefined
    }

    return trimmed
}

export default async function EmbedMenuFinderPage({
    searchParams,
}: {
    searchParams: Promise<EmbedSearchParams>
}) {
    const [resolvedSearchParams, requestLocale] = await Promise.all([searchParams, getLocale()])

    const locale =
        normalizeLocale(
            getFirstQueryValue(resolvedSearchParams.lang),
        ) ?? (requestLocale === 'en' ? 'en' : 'ja')

    const restaurant =
        normalizeRestaurant(getFirstQueryValue(resolvedSearchParams.restaurant)) ??
        DEFAULT_EMBED_RESTAURANT

    const [allMenus, allTags, t] = await Promise.all([
        fetchMenus(createCacheClient(), restaurant, { includeTags: true }),
        getMenuTags(),
        getTranslations({ locale, namespace: 'menuFinder.embed' }),
    ])

    const labels: MenuFinderClientLabels = {
        dietary: t('dietary'),
        price: t('price'),
        pricePresetTemplate: t('pricePreset', { price: '{price}' }),
        ingredients: t('ingredients'),
        excludeHint: t('excludeHint'),
        clearFilters: t('clearFilters'),
        menu: t('menu'),
        priceColumn: t('priceColumn'),
        noResults: t('noResults'),
    }

    const menus = allMenus.filter(menu => menu.is_public)

    return (
        <div className="p-4">
            <MenuFinderClient menus={menus} allTags={allTags} locale={locale} labels={labels} />
        </div>
    )
}