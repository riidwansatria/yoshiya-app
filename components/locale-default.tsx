"use client"

import { useEffect } from "react"

export function LocaleDefault() {
    useEffect(() => {
        const hasLocaleCookie = document.cookie
            .split('; ')
            .some((cookie) => cookie.startsWith('NEXT_LOCALE='))

        if (!hasLocaleCookie) {
            document.cookie = 'NEXT_LOCALE=ja; path=/; max-age=31536000; SameSite=Lax'
        }
    }, [])

    return null
}
