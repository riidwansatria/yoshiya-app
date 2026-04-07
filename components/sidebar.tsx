"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import {
  Sidebar as PrimitiveSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset as PrimitiveSidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider as PrimitiveSidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

function SidebarProvider({ className, ...props }: React.ComponentProps<typeof PrimitiveSidebarProvider>) {
  return (
    <PrimitiveSidebarProvider
      className={cn("app-sidebar-provider", className)}
      {...props}
    />
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<typeof PrimitiveSidebarInset>) {
  return (
    <PrimitiveSidebarInset
      className={cn("app-sidebar-inset", className)}
      {...props}
    />
  )
}

function Sidebar(props: React.ComponentProps<typeof PrimitiveSidebar>) {
  return <PrimitiveSidebar {...props} />
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
}