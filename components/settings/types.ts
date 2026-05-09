export type SettingsSection = "language" | "staff" | "menu-tags" | "purchase-orders"

export interface StaffRecord {
    id: string
    name: string
    role: string
    email: string | null
    is_assignable: boolean
    deleted_at: string | null
}

export function resolveSettingsSection(
    section: string | string[] | undefined,
    userRole?: string | null
): SettingsSection {
    const normalizedSection = Array.isArray(section) ? section[0] : section

    if (normalizedSection === "staff") {
        return userRole === "manager" ? "staff" : "language"
    }

    if (normalizedSection === "menu-tags" || normalizedSection === "purchase-orders") {
        return normalizedSection
    }

    return "language"
}
