import * as React from "react"
import { cn } from "@/lib/utils"

function Page({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page"
      className={cn("flex h-full flex-col", className)}
      {...props}
    />
  )
}

function PageHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header"
      className={cn("shrink-0 flex items-center justify-between gap-4 border-b p-2 md:p-3 min-h-14", className)}
      {...props}
    />
  )
}

function PageHeaderHeading({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-header-heading"
      className={cn("space-y-1", className)}
      {...props}
    />
  )
}

function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="page-title"
      className={cn("text-xl font-bold tracking-tight", className)}
      {...props}
    />
  )
}

function PageDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="page-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function PageActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-actions"
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  )
}

function PageContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-content"
      className={cn("flex-1 overflow-y-auto p-2 md:p-3", className)}
      {...props}
    />
  )
}

function PageFull({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="page-full"
      className={cn("flex h-full flex-col overflow-hidden", className)}
      {...props}
    />
  )
}

export {
  Page,
  PageFull,
  PageHeader,
  PageHeaderHeading,
  PageTitle,
  PageDescription,
  PageActions,
  PageContent,
}
