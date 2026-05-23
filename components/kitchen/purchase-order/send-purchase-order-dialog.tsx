"use client"

import { useState, useTransition } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

import { sendPurchaseOrderEmail } from "@/lib/actions/purchase-orders"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SendPurchaseOrderDialogProps {
    restaurantId: string
    orderId: string
    subject: string
    documentNo: string
    initialEmail: string
    open: boolean
    onOpenChange: (open: boolean) => void
    isResend?: boolean
    onSent?: () => void
}

export function SendPurchaseOrderDialog({
    restaurantId,
    orderId,
    subject,
    documentNo,
    initialEmail,
    open,
    onOpenChange,
    isResend = false,
    onSent,
}: SendPurchaseOrderDialogProps) {
    const t = useTranslations("kitchen.purchaseOrders")
    const [isPending, startTransition] = useTransition()
    const [email, setEmail] = useState(initialEmail)

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        startTransition(async () => {
            const result = await sendPurchaseOrderEmail(restaurantId, orderId, email)
            if (result.error) {
                toast.error(result.error)
                return
            }
            toast.success(t("sendSuccess"))
            onSent?.()
            onOpenChange(false)
        })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t("sendDialogTitle")}</DialogTitle>
                    <DialogDescription>
                        {documentNo} — {subject}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="send-recipient-email">{t("sendRecipientEmail")}</Label>
                        <Input
                            id="send-recipient-email"
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            placeholder="vendor@example.com"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                            {t("sendCancel")}
                        </Button>
                        <Button type="submit" disabled={isPending || !email.trim()}>
                            <Send />
                            {isPending ? t("sendPending") : isResend ? t("resendAction") : t("sendAction")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
