export type SettingsSection = "language" | "staff" | "menu-tags" | "purchase-orders" | "vendors"

export interface StaffRecord {
    id: string
    name: string
    role: string
    email: string | null
    is_assignable: boolean
    deleted_at: string | null
    modules: string[]
}

export function resolveSettingsSection(
    section: string | string[] | undefined,
    allowedSections: SettingsSection[] = ["language"]
): SettingsSection {
    const normalizedSection = Array.isArray(section) ? section[0] : section

    if (
        normalizedSection === "language" ||
        normalizedSection === "staff" ||
        normalizedSection === "menu-tags" ||
        normalizedSection === "purchase-orders" ||
        normalizedSection === "vendors"
    ) {
        return allowedSections.includes(normalizedSection) ? normalizedSection : "language"
    }

    if (allowedSections.includes("language")) {
        return "language"
    }

    return allowedSections[0] ?? "language"
}

export function normalizeAllowedSettingsSections(
    sections: SettingsSection[]
): SettingsSection[] {
    const normalized = Array.from(new Set(["language", ...sections]));
    return normalized.filter((section): section is SettingsSection => {
        return section === "language" ||
            section === "staff" ||
            section === "menu-tags" ||
            section === "purchase-orders" ||
            section === "vendors";
    });
}
