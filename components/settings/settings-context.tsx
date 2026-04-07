"use client"

import * as React from "react"
import type { MenuTagWithCount } from "@/lib/queries/menu-tags"
import type { SettingsSection, StaffRecord } from "./types"

type SettingsContextValue = {
    open: (section?: SettingsSection) => void
}

const SettingsContext = React.createContext<SettingsContextValue | null>(null)

export function useSettings() {
    const ctx = React.useContext(SettingsContext)
    if (!ctx) {
        throw new Error("useSettings must be used within a SettingsProvider")
    }
    return ctx
}

type SettingsProviderProps = {
    children: React.ReactNode
    menuTags: MenuTagWithCount[]
    staff: StaffRecord[]
    userRole?: string | null
}

export function SettingsProvider({ children, menuTags, staff, userRole }: SettingsProviderProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [section, setSection] = React.useState<SettingsSection>("language")

    const open = React.useCallback((s?: SettingsSection) => {
        setSection(s ?? "language")
        setIsOpen(true)
    }, [])

    const contextValue = React.useMemo(() => ({ open }), [open])

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
            {isOpen && (
                <SettingsDialogLazy
                    initialSection={section}
                    menuTags={menuTags}
                    staff={staff}
                    userRole={userRole}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </SettingsContext.Provider>
    )
}

// Inline lazy import to avoid loading settings dialog code until needed
const SettingsDialogLazy = React.lazy(() =>
    import("./settings-dialog").then((mod) => ({ default: mod.SettingsDialog }))
)
