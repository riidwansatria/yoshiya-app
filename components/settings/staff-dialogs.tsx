"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { addStaff, removeStaff, updateStaff } from "@/lib/actions/staff"

const addStaffSchema = z.object({
    name: z.string().min(1, "Name is required"),
    username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscore only"),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

export function AddStaffDialog() {
    const [open, setOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof addStaffSchema>>({
        resolver: zodResolver(addStaffSchema),
        defaultValues: {
            name: "",
            username: "",
            password: "",
        },
    })

    async function onSubmit(values: z.infer<typeof addStaffSchema>) {
        setIsLoading(true)
        try {
            await addStaff(values)
            toast.success("Staff added successfully")
            setOpen(false)
            form.reset()
        } catch (error) {
            toast.error("Failed to add staff. Username might be taken.")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Staff</DialogTitle>
                    <DialogDescription>
                        Create a new staff account. They will be able to log in with the username.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Taro Yamada" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="taro_y" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Staff
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

interface RemoveStaffDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    staff: { id: string; name: string }
}

export function RemoveStaffDialog({ open, onOpenChange, staff }: RemoveStaffDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    async function handleRemove() {
        setIsLoading(true)
        try {
            await removeStaff(staff.id)
            toast.success("Staff removed successfully")
            onOpenChange(false)
        } catch (error) {
            toast.error("Failed to remove staff")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Remove Staff?</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to remove <strong>{staff.name}</strong>?
                        They will no longer be able to log in, but past assignment records will be preserved.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleRemove} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Remove
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

const editStaffSchema = z.object({
    name: z.string().min(1, "Name is required"),
    password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
})

interface EditStaffDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    staff: { id: string; name: string; email?: string }
}

export function EditStaffDialog({ open, onOpenChange, staff }: EditStaffDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof editStaffSchema>>({
        resolver: zodResolver(editStaffSchema),
        defaultValues: {
            name: staff.name,
            password: "",
        },
    })

    // Update form default values when staff changes
    // But since dialog is destroyed/recreated typically or key changes, might be fine.
    // If we reuse the same dialog instance, we might need useEffect.
    // For now assuming separate instances or key prop usage.

    async function onSubmit(values: z.infer<typeof editStaffSchema>) {
        setIsLoading(true)
        try {
            await updateStaff(staff.id, {
                name: values.name,
                password: values.password || undefined
            })
            toast.success("Staff updated successfully")
            onOpenChange(false)
            form.reset({ name: values.name, password: "" })
        } catch (error) {
            toast.error("Failed to update staff")
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }

    const username = staff.email ? staff.email.split('@')[0] : 'Unknown'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Staff</DialogTitle>
                    <DialogDescription>
                        Update staff details. Username cannot be changed.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <FormLabel>Username</FormLabel>
                            <Input value={username} disabled readOnly />
                        </div>

                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Password</FormLabel>
                                    <FormControl>
                                        <Input type="password" placeholder="(Leave blank to keep current)" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Optional. Fill only if you want to change the password.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Staff
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
