const translations = {
    en: {
        // DataTableToolbar
        reset: 'Reset',
        // DataTableColumnHeader
        asc: 'Asc',
        desc: 'Desc',
        resetSort: 'Reset',
        hide: 'Hide',
        // DataTableSortList
        sort: 'Sort',
        sortBy: 'Sort by',
        noSortingApplied: 'No sorting applied',
        modifySortingHint: 'Modify sorting to organize your rows.',
        addSortingHint: 'Add sorting to organize your rows.',
        addSort: 'Add sort',
        resetSorting: 'Reset sorting',
        searchFields: 'Search fields...',
        noFieldsFound: 'No fields found.',
        // DataTableViewOptions
        view: 'View',
        toggleColumns: 'Toggle columns',
        searchColumns: 'Search columns...',
        noColumnsFound: 'No columns found.',
        // DataTableFacetedFilter
        noResultsFound: 'No results found.',
        clearFilters: 'Clear filters',
        selected: (count: number) => `${count} selected`,
    },
    ja: {
        reset: 'リセット',
        asc: '昇順',
        desc: '降順',
        resetSort: 'リセット',
        hide: '非表示',
        sort: '並び替え',
        sortBy: '並び替え条件',
        noSortingApplied: '並び替えなし',
        modifySortingHint: '並び替えを変更して行を整理します。',
        addSortingHint: '並び替えを追加して行を整理します。',
        addSort: '追加',
        resetSorting: 'リセット',
        searchFields: 'フィールドを検索...',
        noFieldsFound: 'フィールドが見つかりません。',
        view: '表示',
        toggleColumns: '列の表示切替',
        searchColumns: '列を検索...',
        noColumnsFound: '列が見つかりません。',
        noResultsFound: '結果が見つかりません。',
        clearFilters: 'フィルターをクリア',
        selected: (count: number) => `${count}件選択`,
    },
} as const;

type Locale = keyof typeof translations;

const SUPPORTED_LOCALES = new Set<string>(['en', 'ja']);

export function getDataTableI18n(locale: string) {
    const key: Locale = SUPPORTED_LOCALES.has(locale) ? (locale as Locale) : 'en';
    return translations[key];
}
