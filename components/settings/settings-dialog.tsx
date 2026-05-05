"use client"

import { useTranslations } from "next-intl"

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from "@/components/ui/dialog"

import { SettingsShell } from "./settings-shell"
import type { SettingsSection, StaffRecord } from "./types"
import type { MenuTagWithCount } from "@/lib/queries/menu-tags"

type SettingsDialogProps = {
    initialSection: SettingsSection
    menuTags: MenuTagWithCount[]
    onClose: () => void
    staff: StaffRecord[]
    userRole?: string | null
}

export function SettingsDialog({
    initialSection,
    menuTags,
    onClose,
    staff,
    userRole,
}: SettingsDialogProps) {
    const t = useTranslations("settings")

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                showCloseButton={false}
                className="overflow-hidden flex flex-col gap-0 p-0 max-w-none sm:max-w-none"
                style={{ width: "min(1000px, calc(100vw - 2rem))", height: "min(600px, calc(100svh - 2rem))" }}
            >
                <DialogTitle className="sr-only">{t("title")}</DialogTitle>
                <DialogDescription className="sr-only">
                    {t("dialogDescription")}
                </DialogDescription>
                <SettingsShell
                    initialSection={initialSection}
                    menuTags={menuTags}
                    staff={staff}
                    userRole={userRole}
                />
            </DialogContent>
        </Dialog>
    )
}
