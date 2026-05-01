import type { Menu } from '@/lib/types/kitchen';

export function getLocalizedMenuName(menu: Pick<Menu, 'name' | 'name_en'>, locale: string): string {
    return locale === 'en' && menu.name_en ? menu.name_en : menu.name;
}
