"use client"

import * as React from "react"
import type { MenuTagWithCount } from "@/lib/queries/menu-tags"
import type { PurchaseOrderSettings } from "@/lib/queries/purchase-orders"
import type { Vendor } from "@/lib/queries/vendors"
import { normalizeAllowedSettingsSections, type SettingsSection, type StaffRecord } from "./types"

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
    purchaseOrderSettings: PurchaseOrderSettings[]
    staff: StaffRecord[]
    allowedSections: SettingsSection[]
    vendors: Vendor[]
}

export function SettingsProvider({
    children,
    menuTags,
    purchaseOrderSettings,
    staff,
    allowedSections,
    vendors,
}: SettingsProviderProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [section, setSection] = React.useState<SettingsSection>("language")
    const normalizedAllowedSections = React.useMemo(
        () => normalizeAllowedSettingsSections(allowedSections),
        [allowedSections]
    )

    const open = React.useCallback((s?: SettingsSection) => {
        const requested = s ?? "language"
        setSection(normalizedAllowedSections.includes(requested) ? requested : "language")
        setIsOpen(true)
    }, [normalizedAllowedSections])

    const contextValue = React.useMemo(() => ({ open }), [open])

    return (
        <SettingsContext.Provider value={contextValue}>
            {children}
            {isOpen && (
                <SettingsDialogLazy
                    initialSection={section}
                    menuTags={menuTags}
                    purchaseOrderSettings={purchaseOrderSettings}
                    staff={staff}
                    allowedSections={normalizedAllowedSections}
                    vendors={vendors}
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
