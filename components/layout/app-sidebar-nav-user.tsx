"use client"

import { useState } from "react"
import {
    ChevronsUpDown,
    LogOut,
    Settings,
} from "lucide-react"

import {
    Avatar,
    AvatarFallback,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { useSettings } from "@/components/settings/settings-context"
import { createClient } from "@/lib/supabase/client"

type NavUserProps = {
    displayName?: string | null
    email?: string | null
}

function getUserHandle(email?: string | null) {
    const trimmedEmail = email?.trim()
    if (!trimmedEmail) return null

    const [username, domain] = trimmedEmail.split('@')
    if (domain === 'yoshiya.internal') return username || null

    return trimmedEmail
}

export function NavUser({ displayName, email }: NavUserProps) {
    const t = useTranslations('userMenu')
    const { isMobile } = useSidebar()
    const router = useRouter()
    const settings = useSettings()
    const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
    const [isLoggingOut, setIsLoggingOut] = useState(false)

    const handleLogout = async () => {
        setIsLoggingOut(true)
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push('/login')
        router.refresh()
    }

    const userHandle = getUserHandle(email)
    const label = displayName?.trim() || userHandle || t('defaultName')
    const userInitial = label.substring(0, 2).toUpperCase()

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg">{userInitial}</AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">{label}</span>
                            </div>
                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">{userInitial}</AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">{label}</span>
                                    {userHandle ? <span className="truncate text-xs">{userHandle}</span> : null}
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => settings.open()}>
                                <Settings className="mr-2 h-4 w-4" />
                                {t('settings')}
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setLogoutDialogOpen(true)}>
                            <LogOut className="mr-2 h-4 w-4" />
                            {t('logout')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{t('logoutConfirmTitle')}</DialogTitle>
                            <DialogDescription>{t('logoutConfirmBody')}</DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setLogoutDialogOpen(false)}
                                disabled={isLoggingOut}
                            >
                                {t('cancel')}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? t('loggingOut') : t('logout')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
