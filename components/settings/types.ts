export type SettingsSection = "language" | "staff"

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

    if (normalizedSection === "staff" && userRole === "manager") {
        return "staff"
    }

    return "language"
}
