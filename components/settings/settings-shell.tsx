"use client"

import * as React from "react"
import { Globe, Tag, UserCog, X } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

import type { MenuTagWithCount } from "@/lib/queries/menu-tags"
import { MenuTagsTable } from "@/components/settings/menu-tags-table"
import { StaffTable } from "@/components/settings/staff-table"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DialogClose } from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
} from "@/components/layout/sidebar"

import type { SettingsSection, StaffRecord } from "./types"

type SettingsShellProps = {
    initialSection: SettingsSection
    menuTags: MenuTagWithCount[]
    staff: StaffRecord[]
    userRole?: string | null
}

type SettingsNavItem = {
    description: string
    icon: React.ComponentType<{ className?: string }>
    id: SettingsSection
    label: string
}

export function SettingsShell({
    initialSection,
    menuTags,
    staff,
    userRole,
}: SettingsShellProps) {
    const locale = useLocale()
    const router = useRouter()
    const t = useTranslations("settings")
    const [activeSection, setActiveSection] = React.useState<SettingsSection>(initialSection)
    const [isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
        setActiveSection(initialSection)
    }, [initialSection])

    const navigationItems: SettingsNavItem[] = [
        {
            description: t("language.description"),
            icon: Globe,
            id: "language",
            label: t("sections.language"),
        },
        {
            description: t("menuTags.description"),
            icon: Tag,
            id: "menu-tags",
            label: t("sections.menuTags"),
        },
    ]

    if (userRole === "manager") {
        navigationItems.push({
            description: t("staff.description"),
            icon: UserCog,
            id: "staff",
            label: t("sections.staff"),
        })
    }

    const activeItem =
        navigationItems.find((item) => item.id === activeSection) ?? navigationItems[0]

    const handleSectionChange = (nextSection: SettingsSection) => {
        if (nextSection === activeSection) return
        setActiveSection(nextSection)
    }

    const handleLanguageChange = (nextLocale: "en" | "ja") => {
        if (nextLocale === locale) return
        document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`
        startTransition(() => { router.refresh() })
    }

    return (
        <SidebarProvider className="min-h-0 h-full! w-full items-start">
            <Sidebar collapsible="none" className="hidden h-full md:flex">
                <SidebarContent className="gap-0">
                    <SidebarGroup>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {navigationItems.map((item) => (
                                    <SidebarMenuItem key={item.id}>
                                        <SidebarMenuButton
                                            isActive={item.id === activeSection}
                                            onClick={() => handleSectionChange(item.id)}
                                        >
                                            <item.icon />
                                            <span>{item.label}</span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>
                                ))}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                </SidebarContent>
            </Sidebar>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background h-full border-l">
                <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
                    <div className="min-w-0 flex-1">
                        <Breadcrumb>
                            <BreadcrumbList>
                                <BreadcrumbItem className="hidden md:block">
                                    <BreadcrumbPage>{t("title")}</BreadcrumbPage>
                                </BreadcrumbItem>
                                <BreadcrumbSeparator className="hidden md:block" />
                                <BreadcrumbItem>
                                    <BreadcrumbPage>{activeItem.label}</BreadcrumbPage>
                                </BreadcrumbItem>
                            </BreadcrumbList>
                        </Breadcrumb>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                            {activeItem.description}
                        </p>
                    </div>

                    <div className="md:hidden">
                        <Select
                            value={activeSection}
                            onValueChange={(value) => handleSectionChange(value as SettingsSection)}
                        >
                            <SelectTrigger className="w-52">
                                <SelectValue placeholder={t("mobileNavPlaceholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {navigationItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="ml-2 shrink-0">
                            <X className="size-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DialogClose>
                </header>

                <div className="flex-1 overflow-y-auto">
                    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
                        {activeSection === "language" ? (
                            <Card>
                                <CardHeader>
                                    <CardTitle>{t("language.title")}</CardTitle>
                                    <CardDescription>{t("language.body")}</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-3 text-left sm:grid-cols-2">
                                    <Button
                                        aria-pressed={locale === "ja"}
                                        className="h-auto items-start justify-between gap-3 whitespace-normal px-4 py-4 text-left"
                                        disabled={isPending}
                                        onClick={() => handleLanguageChange("ja")}
                                        variant={locale === "ja" ? "default" : "outline"}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">{t("language.japaneseLabel")}</div>
                                            <div className="text-xs opacity-80">{t("language.japaneseDescription")}</div>
                                        </div>
                                        {locale === "ja" ? <span className="shrink-0 text-xs">{t("language.current")}</span> : null}
                                    </Button>
                                    <Button
                                        aria-pressed={locale === "en"}
                                        className="h-auto items-start justify-between gap-3 whitespace-normal px-4 py-4 text-left"
                                        disabled={isPending}
                                        onClick={() => handleLanguageChange("en")}
                                        variant={locale === "en" ? "default" : "outline"}
                                    >
                                        <div className="min-w-0">
                                            <div className="font-medium">{t("language.englishLabel")}</div>
                                            <div className="text-xs opacity-80">{t("language.englishDescription")}</div>
                                        </div>
                                        {locale === "en" ? <span className="shrink-0 text-xs">{t("language.current")}</span> : null}
                                    </Button>
                                    <p className="text-muted-foreground text-sm sm:col-span-2">
                                        {isPending ? t("language.updating") : t("language.hint")}
                                    </p>
                                </CardContent>
                            </Card>
                        ) : null}

                        {activeSection === "menu-tags" ? (
                            <MenuTagsTable data={menuTags} />
                        ) : null}

                        {activeSection === "staff" && userRole === "manager" ? (
                            <StaffTable data={staff} />
                        ) : null}
                    </div>
                </div>
            </div>
        </SidebarProvider>
    )
}
