import type { Menu } from '@/lib/types/kitchen'
import { cn } from '@/lib/utils'

function getImageLabel(menu: Menu) {
    const source = menu.name.trim()
    if (!source) {
        return 'Chef selection'
    }

    return source
        .split(/\s+/)
        .slice(0, 3)
        .map((part) => part.toUpperCase())
        .join('\n')
}

function getImagePalette(color?: string | null) {
    if (!color) {
        return {
            base: '#efe4c8',
            stripe: '#e4d7b7',
            border: '#d5c4a1',
        }
    }

    return {
        base: `${color}22`,
        stripe: `${color}14`,
        border: `${color}55`,
    }
}

export function MenuListImage({
    menu,
    className,
    labelClassName,
}: {
    menu: Menu
    className?: string
    labelClassName?: string
}) {
    if (menu.image_url) {
        return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
                src={menu.image_url}
                alt={menu.name}
                className={cn(
                    'h-28 w-28 rounded-2xl border object-cover shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
                    className
                )}
            />
        )
    }

    const palette = getImagePalette(menu.color)
    const label = getImageLabel(menu)

    return (
        <div
            aria-hidden="true"
            className={cn(
                'relative h-28 w-28 overflow-hidden rounded-2xl border shadow-[0_8px_24px_rgba(15,23,42,0.08)]',
                className
            )}
            style={{
                backgroundColor: palette.base,
                borderColor: palette.border,
                backgroundImage: `repeating-linear-gradient(135deg, ${palette.base} 0 12px, ${palette.stripe} 12px 24px)`,
            }}
        >
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0))]" />
            <div className="absolute inset-0 p-3">
                <div className="flex h-full items-end">
                    <div
                        className={cn(
                            'max-w-[5.5rem] whitespace-pre-line text-[0.6rem] font-medium uppercase tracking-[0.24em] text-stone-700 sm:text-[0.7rem]',
                            labelClassName
                        )}
                    >
                        {label}
                    </div>
                </div>
            </div>
        </div>
    )
}
