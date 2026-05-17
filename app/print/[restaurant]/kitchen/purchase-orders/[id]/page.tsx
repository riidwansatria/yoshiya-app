import { format, parseISO } from "date-fns"
import { enUS, ja } from "date-fns/locale"
import { notFound } from "next/navigation"

import { AutoPrint } from "@/components/print/auto-print"
import {
  getPurchaseOrderById,
  getPurchaseOrderSettings,
  type PurchaseOrderSettings,
} from "@/lib/queries/purchase-orders"
import { requirePagePermission } from "@/lib/auth/server"

const DEFAULT_SENDER = {
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

function formatNumber(value: number | null) {
  if (value === null) return "—"
  return value.toLocaleString("ja-JP")
}

function getPrintQuantity(line: {
  package_size?: number | null
  order_quantity?: number | null
  needed_quantity?: number | null
}): number | null {
  if (line.package_size) return line.order_quantity ?? null
  return line.order_quantity ?? line.needed_quantity ?? null
}

function getPrintUnit(
  line: {
    package_size?: number | null
    package_label?: string | null
    unit?: string | null
  }
) {
  if (line.package_size) return line.package_label || (line.unit ?? "")
  return line.unit ?? ""
}

function getSender(settings: PurchaseOrderSettings | null) {
  return {
    company_name: settings?.company_name || DEFAULT_SENDER.company_name,
    postal_code: settings?.postal_code ?? DEFAULT_SENDER.postal_code,
    address: settings?.address ?? DEFAULT_SENDER.address,
    tel: settings?.tel ?? DEFAULT_SENDER.tel,
    fax: settings?.fax ?? DEFAULT_SENDER.fax,
    email: settings?.email ?? DEFAULT_SENDER.email,
    contact_person: settings?.contact_person ?? DEFAULT_SENDER.contact_person,
    show_postal_code: settings?.show_postal_code ?? DEFAULT_SENDER.show_postal_code,
    show_address: settings?.show_address ?? DEFAULT_SENDER.show_address,
    show_tel: settings?.show_tel ?? DEFAULT_SENDER.show_tel,
    show_fax: settings?.show_fax ?? DEFAULT_SENDER.show_fax,
    show_email: settings?.show_email ?? DEFAULT_SENDER.show_email,
    show_contact_person: settings?.show_contact_person ?? DEFAULT_SENDER.show_contact_person,
  }
}

export default async function PurchaseOrderPrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ restaurant: string; id: string }>
  searchParams: Promise<{ locale?: string }>
}) {
  const { restaurant, id } = await params
  await requirePagePermission("procurement", "procurement.read")
  const resolvedSearchParams = await searchParams
  const localeCode = resolvedSearchParams.locale === "ja" ? "ja" : "en"
  const dateLocale = localeCode === "ja" ? ja : enUS
  const [order, settings] = await Promise.all([
    getPurchaseOrderById(id),
    getPurchaseOrderSettings(restaurant),
  ])

  if (!order) {
    notFound()
  }

  const sender = getSender(settings)
  const formattedDate = format(
    parseISO(order.order_date),
    localeCode === "ja" ? "yyyy年M月d日 (EEE)" : "EEEE, MMMM do, yyyy",
    { locale: dateLocale },
  )
  const documentNo = order.document_no
  const paddedLines = [
    ...order.lines,
    ...Array.from({ length: Math.max(0, 12 - order.lines.length) }, (_, index) => ({
      id: `empty-${index}`,
      item_name: "",
      unit: null,
      needed_quantity: null,
      package_size: null,
      package_label: null,
      order_quantity: null,
      memo: null,
    })),
  ]
  const remarks = order.notes?.trim() ?? ""

  return (
    <div className="mx-auto min-h-screen w-full bg-muted/20 p-6 text-foreground print:bg-background print:p-0">
      <AutoPrint />

      <main className="mx-auto min-h-[297mm] w-[210mm] bg-background px-[18mm] py-[16mm] shadow-sm print:min-h-0 print:w-full print:p-0 print:shadow-none">
        <div className="mb-8 grid grid-cols-[1fr_auto] items-start gap-6">
          <div />
          <div className="text-right text-xs leading-6">
            <div>{formattedDate}</div>
          </div>
        </div>

        <h1 className="mb-8 text-center text-2xl font-bold tracking-[0.5em]">
          発 注 書
        </h1>

        <section className="mb-8 grid grid-cols-2 gap-12 text-sm">
          <div className="space-y-5">
            <div className="flex items-end gap-3">
              <div className="min-w-0 flex-1 border-b border-foreground px-2 pb-1 text-center text-base font-medium">
                {order.supplier_name}
              </div>
              <span>御中</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-[4.5rem_1fr] items-end gap-2">
                <span className="text-muted-foreground">件名</span>
                <span className="border-b border-border px-2 pb-1">{order.subject}</span>
              </div>
              <div className="grid grid-cols-[4.5rem_1fr] items-end gap-2">
                <span className="text-muted-foreground">発注No.</span>
                <span className="border-b border-border px-2 pb-1">{documentNo}</span>
              </div>
            </div>

            <p className="pt-3 text-xs">下記のとおり発注いたします。</p>
          </div>

          <div className="space-y-1 text-xs leading-6">
            <div className="font-medium">{sender.company_name}</div>
            {sender.show_postal_code && sender.postal_code ? <div>{sender.postal_code}</div> : null}
            {sender.show_address && sender.address ? <div>{sender.address}</div> : null}
            {sender.show_tel ? <div>TEL：{sender.tel}</div> : null}
            {sender.show_fax ? <div>FAX：{sender.fax}</div> : null}
            {sender.show_email ? <div>EMAIL：{sender.email}</div> : null}
            {sender.show_contact_person ? <div>担当：{sender.contact_person}</div> : null}
          </div>
        </section>

        <table className="mb-4 w-full border-collapse text-xs">
          <thead>
            <tr className="bg-foreground text-background">
              <th className="border border-foreground px-2 py-1.5 font-medium">項目</th>
              <th className="w-22 border border-foreground px-2 py-1.5 font-medium">数量</th>
              <th className="w-18 border border-foreground px-2 py-1.5 font-medium">単位</th>
              <th className="w-40 border border-foreground px-2 py-1.5 font-medium">備考</th>
            </tr>
          </thead>
          <tbody>
            {paddedLines.map((line) => {
              const isEmpty = line.item_name === ""
              return (
                <tr key={line.id} className="h-7 break-inside-avoid">
                  <td className="border border-foreground/80 px-2 py-1 font-medium">
                    {line.item_name}
                  </td>
                  <td className="border border-foreground/80 px-2 py-1 text-right tabular-nums">
                    {isEmpty ? "" : formatNumber(getPrintQuantity(line))}
                  </td>
                  <td className="border border-foreground/80 px-2 py-1 text-center">
                    {isEmpty ? "" : getPrintUnit(line)}
                  </td>
                  <td className="border border-foreground/80 px-2 py-1 text-muted-foreground">
                    {line.memo ?? ""}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <section className="mt-4">
          <div className="bg-foreground px-2 py-1 text-center text-xs font-medium text-background">特記事項</div>
          <div className="min-h-24 whitespace-pre-wrap border border-foreground p-2 text-xs text-muted-foreground">
            {remarks}
          </div>
        </section>
      </main>
    </div>
  )
}
