"use client"

import * as React from "react"
import { Save } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

import { updatePurchaseOrderSettings } from "@/lib/actions/purchase-orders"
import type { PurchaseOrderSettings } from "@/lib/queries/purchase-orders"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

interface PurchaseOrderSettingsFormProps {
    settings: PurchaseOrderSettings[]
}

type FormState = {
    company_name: string
    postal_code: string
    address: string
    tel: string
    fax: string
    email: string
    contact_person: string
    show_postal_code: boolean
    show_address: boolean
    show_tel: boolean
    show_fax: boolean
    show_email: boolean
    show_contact_person: boolean
}

type TextField = Extract<keyof FormState, "company_name" | "postal_code" | "address" | "tel" | "fax" | "email" | "contact_person">
type ToggleField = Extract<keyof FormState, "show_postal_code" | "show_address" | "show_tel" | "show_fax" | "show_email" | "show_contact_person">

const DEFAULT_SETTINGS: FormState = {
    company_name: "よしや",
    postal_code: "〒616-8384",
    address: "京都府京都市右京区嵯峨天龍寺造路町",
    tel: "",
    fax: "",
    email: "",
    contact_person: "",
    show_postal_code: true,
    show_address: true,
    show_tel: true,
    show_fax: true,
    show_email: true,
    show_contact_person: true,
}

function toFormState(settings: PurchaseOrderSettings | undefined): FormState {
    if (!settings) return DEFAULT_SETTINGS

    return {
        company_name: settings.company_name || DEFAULT_SETTINGS.company_name,
        postal_code: settings.postal_code ?? "",
        address: settings.address ?? "",
        tel: settings.tel ?? "",
        fax: settings.fax ?? "",
        email: settings.email ?? "",
        contact_person: settings.contact_person ?? "",
        show_postal_code: settings.show_postal_code,
        show_address: settings.show_address,
        show_tel: settings.show_tel,
        show_fax: settings.show_fax,
        show_email: settings.show_email,
        show_contact_person: settings.show_contact_person,
    }
}

function getParamValue(value: string | string[] | undefined) {
    return Array.isArray(value) ? value[0] : value
}

function PrintToggle({
    checked,
    onCheckedChange,
}: {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
}) {
    return (
        <Switch size="sm" checked={checked} onCheckedChange={onCheckedChange} />
    )
}

export function PurchaseOrderSettingsForm({ settings }: PurchaseOrderSettingsFormProps) {
    const router = useRouter()
    const params = useParams()
    const t = useTranslations("settings.purchaseOrders")
    const restaurantId = getParamValue(params.restaurant) ?? "kitchen"
    const currentSettings =
        settings.find((item) => item.restaurant_id === restaurantId) ??
        settings.find((item) => item.restaurant_id === "kitchen")

    const [form, setForm] = React.useState<FormState>(() => toFormState(currentSettings))
    const [isPending, startTransition] = React.useTransition()

    React.useEffect(() => {
        setForm(toFormState(currentSettings))
    }, [currentSettings])

    const updateField = (field: TextField, value: string) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const updateToggle = (field: ToggleField, value: boolean) => {
        setForm((current) => ({ ...current, [field]: value }))
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        startTransition(async () => {
            const result = await updatePurchaseOrderSettings(restaurantId, form)

            if (result.error) {
                toast.error(result.error)
                return
            }

            toast.success(t("saveSuccess"))
            router.refresh()
        })
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent>
                <form className="grid gap-4" onSubmit={handleSubmit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-medium">
                            {t("companyName")}
                            <Input
                                value={form.company_name}
                                onChange={(event) => updateField("company_name", event.target.value)}
                                required
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                            <span className="flex items-center justify-between gap-2">
                                {t("postalCode")}
                                <PrintToggle
                                    checked={form.show_postal_code}
                                    onCheckedChange={(checked) => updateToggle("show_postal_code", checked)}
                                />
                            </span>
                            <Input
                                value={form.postal_code}
                                onChange={(event) => updateField("postal_code", event.target.value)}
                            />
                        </label>
                    </div>

                    <label className="grid gap-1.5 text-sm font-medium">
                        <span className="flex items-center justify-between gap-2">
                            {t("address")}
                            <PrintToggle
                                checked={form.show_address}
                                onCheckedChange={(checked) => updateToggle("show_address", checked)}
                            />
                        </span>
                        <Input
                            value={form.address}
                            onChange={(event) => updateField("address", event.target.value)}
                        />
                    </label>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <label className="grid gap-1.5 text-sm font-medium">
                            <span className="flex items-center justify-between gap-2">
                                {t("tel")}
                                <PrintToggle
                                    checked={form.show_tel}
                                    onCheckedChange={(checked) => updateToggle("show_tel", checked)}
                                />
                            </span>
                            <Input
                                value={form.tel}
                                onChange={(event) => updateField("tel", event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                            <span className="flex items-center justify-between gap-2">
                                {t("fax")}
                                <PrintToggle
                                    checked={form.show_fax}
                                    onCheckedChange={(checked) => updateToggle("show_fax", checked)}
                                />
                            </span>
                            <Input
                                value={form.fax}
                                onChange={(event) => updateField("fax", event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                            <span className="flex items-center justify-between gap-2">
                                {t("email")}
                                <PrintToggle
                                    checked={form.show_email}
                                    onCheckedChange={(checked) => updateToggle("show_email", checked)}
                                />
                            </span>
                            <Input
                                value={form.email}
                                onChange={(event) => updateField("email", event.target.value)}
                            />
                        </label>
                        <label className="grid gap-1.5 text-sm font-medium">
                            <span className="flex items-center justify-between gap-2">
                                {t("contactPerson")}
                                <PrintToggle
                                    checked={form.show_contact_person}
                                    onCheckedChange={(checked) => updateToggle("show_contact_person", checked)}
                                />
                            </span>
                            <Input
                                value={form.contact_person}
                                onChange={(event) => updateField("contact_person", event.target.value)}
                            />
                        </label>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <div className="font-medium">{form.company_name || DEFAULT_SETTINGS.company_name}</div>
                        {form.show_postal_code && form.postal_code ? <div>{form.postal_code}</div> : null}
                        {form.show_address && form.address ? <div>{form.address}</div> : null}
                        {form.show_tel ? <div>TEL：{form.tel}</div> : null}
                        {form.show_fax ? <div>FAX：{form.fax}</div> : null}
                        {form.show_email ? <div>EMAIL：{form.email}</div> : null}
                        {form.show_contact_person ? <div>担当：{form.contact_person}</div> : null}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isPending || !form.company_name.trim()}>
                            <Save />
                            {isPending ? t("saving") : t("save")}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
